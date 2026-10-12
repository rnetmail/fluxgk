#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FluxGK - gera os .glb low-poly usados pelo tatica3d.html
(assets/goleiro.glb, assets/jogador.glb, assets/adversario.glb).

SEM dependencias: escreve glTF 2.0 binario na mao (JSON chunk + BIN chunk).
O dono nao tinha os modelos; estes sao gerados por codigo e reprodutiveis.

Figuras: humanoide low-poly com cabeca, cabelo, pescoco, torso, bracos, maos,
shorts, coxas, meioes e chuteiras. Pe no chao (y=0), rosto para +Z, ~1.84 de
altura (unidade = metro, mesma escala do campo do tatica3d).
O goleiro tem camisa amarela, MANGA LONGA e LUVAS verdes maiores - da para
distinguir de longe, que e o ponto.

Rodar:  python3 tools/gerar-glb.py
"""
import json
import os
import struct

AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(AQUI, '..', 'assets'))


# --------------------------------------------------------------------------
# geometria
# --------------------------------------------------------------------------
def box(cx, cy, cz, sx, sy, sz):
    """Caixa com normais chapadas: 24 vertices (4 por face) e 36 indices."""
    hx, hy, hz = sx / 2.0, sy / 2.0, sz / 2.0
    faces = [
        ((0.0, 0.0, 1.0),  [(-hx, -hy,  hz), ( hx, -hy,  hz), ( hx,  hy,  hz), (-hx,  hy,  hz)]),
        ((0.0, 0.0, -1.0), [( hx, -hy, -hz), (-hx, -hy, -hz), (-hx,  hy, -hz), ( hx,  hy, -hz)]),
        ((1.0, 0.0, 0.0),  [( hx, -hy,  hz), ( hx, -hy, -hz), ( hx,  hy, -hz), ( hx,  hy,  hz)]),
        ((-1.0, 0.0, 0.0), [(-hx, -hy, -hz), (-hx, -hy,  hz), (-hx,  hy,  hz), (-hx,  hy, -hz)]),
        ((0.0, 1.0, 0.0),  [(-hx,  hy,  hz), ( hx,  hy,  hz), ( hx,  hy, -hz), (-hx,  hy, -hz)]),
        ((0.0, -1.0, 0.0), [(-hx, -hy, -hz), ( hx, -hy, -hz), ( hx, -hy,  hz), (-hx, -hy,  hz)]),
    ]
    verts, norms, idx = [], [], []
    for n, quad in faces:
        b = len(verts)
        for (x, y, z) in quad:
            verts.append((x + cx, y + cy, z + cz))
            norms.append(n)
        idx += [b, b + 1, b + 2, b, b + 2, b + 3]
    return verts, norms, idx


def corpo(manga_na_camisa, luva_grande):
    """Grupos de caixas por material. Devolve {material: (verts, norms, idx)}."""
    partes = []

    def put(mat, cx, cy, cz, sx, sy, sz):
        partes.append((mat, (cx, cy, cz, sx, sy, sz)))

    g = 0.06 if luva_grande else 0.0            # engorda a luva do goleiro
    manga = 'camisa' if manga_na_camisa else 'pele'

    for lado in (-1, 1):
        x = 0.13 * lado
        put('chuteira', x, 0.04, 0.04, 0.18, 0.08, 0.28)   # pe
        put('meiao',    x, 0.25, 0.00, 0.15, 0.34, 0.16)   # canela/meiao
        put('pele',     x, 0.59, 0.00, 0.17, 0.34, 0.18)   # coxa
        put(manga,  0.29 * lado, 1.20, 0.00, 0.12, 0.50, 0.14)                      # braco
        put('luva', 0.29 * lado, 0.90, 0.02, 0.14 + g, 0.16 + g, 0.17 + g)          # mao/luva

    put('short',  0.0, 0.84, 0.0, 0.46, 0.26, 0.26)
    put('camisa', 0.0, 1.22, 0.0, 0.44, 0.50, 0.26)
    put('pele',   0.0, 1.51, 0.0, 0.12, 0.08, 0.12)        # pescoco
    put('pele',   0.0, 1.68, 0.0, 0.24, 0.26, 0.24)        # cabeca
    put('cabelo', 0.0, 1.805, 0.0, 0.25, 0.07, 0.25)

    grupos = {}
    for mat, args in partes:
        v, n, i = box(*args)
        gv, gn, gi = grupos.setdefault(mat, ([], [], []))
        base = len(gv)
        gv.extend(v)
        gn.extend(n)
        gi.extend([k + base for k in i])
    return grupos


# --------------------------------------------------------------------------
# cor
# --------------------------------------------------------------------------
def srgb_para_linear(hexa):
    """baseColorFactor do glTF e LINEAR; hex de design e sRGB."""
    h = hexa.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


# --------------------------------------------------------------------------
# glb
# --------------------------------------------------------------------------
def build_glb(nome, grupos, cores, brilho):
    bin_buf = bytearray()
    views, accs, prims, mats = [], [], [], []

    for mat in sorted(grupos.keys()):
        verts, norms, idx = grupos[mat]
        dados = (
            (struct.pack('<%dH' % len(idx), *idx), 34963),
            (b''.join(struct.pack('<3f', *v) for v in verts), 34962),
            (b''.join(struct.pack('<3f', *n) for n in norms), 34962),
        )
        offs = []
        for data, target in dados:
            while len(bin_buf) % 4:
                bin_buf.append(0)
            views.append({'buffer': 0, 'byteOffset': len(bin_buf),
                          'byteLength': len(data), 'target': target})
            bin_buf += data
            offs.append(len(views) - 1)

        ai = len(accs)
        xs = [v[0] for v in verts]
        ys = [v[1] for v in verts]
        zs = [v[2] for v in verts]
        accs.append({'bufferView': offs[0], 'componentType': 5123,
                     'count': len(idx), 'type': 'SCALAR'})
        accs.append({'bufferView': offs[1], 'componentType': 5126,
                     'count': len(verts), 'type': 'VEC3',
                     'min': [min(xs), min(ys), min(zs)],
                     'max': [max(xs), max(ys), max(zs)]})
        accs.append({'bufferView': offs[2], 'componentType': 5126,
                     'count': len(norms), 'type': 'VEC3'})

        r, g, b = srgb_para_linear(cores[mat])
        mats.append({'name': mat, 'doubleSided': False,
                     'pbrMetallicRoughness': {
                         'baseColorFactor': [r, g, b, 1.0],
                         'metallicFactor': 0.0,
                         'roughnessFactor': brilho.get(mat, 0.75)}})
        prims.append({'attributes': {'POSITION': ai + 1, 'NORMAL': ai + 2},
                      'indices': ai, 'material': len(mats) - 1})

    while len(bin_buf) % 4:
        bin_buf.append(0)

    gltf = {
        'asset': {'version': '2.0', 'generator': 'FluxGK tools/gerar-glb.py'},
        'scene': 0,
        'scenes': [{'name': nome, 'nodes': [0]}],
        'nodes': [{'name': nome, 'mesh': 0}],
        'meshes': [{'name': nome, 'primitives': prims}],
        'materials': mats,
        'accessors': accs,
        'bufferViews': views,
        'buffers': [{'byteLength': len(bin_buf)}],
    }

    js = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(js) % 4:
        js += b' '

    total = 12 + 8 + len(js) + 8 + len(bin_buf)
    out = bytearray()
    out += b'glTF' + struct.pack('<II', 2, total)
    out += struct.pack('<I', len(js)) + b'JSON' + js
    out += struct.pack('<I', len(bin_buf)) + b'BIN\x00' + bytes(bin_buf)
    return bytes(out)


# --------------------------------------------------------------------------
# conferencia estrutural (o GLTFLoader recusa o que nao fecha)
# --------------------------------------------------------------------------
def conferir(caminho):
    with open(caminho, 'rb') as f:
        raw = f.read()
    assert raw[:4] == b'glTF', 'magic errado'
    ver, tam = struct.unpack('<II', raw[4:12])
    assert ver == 2, 'versao != 2'
    assert tam == len(raw), 'length do header (%d) != tamanho do arquivo (%d)' % (tam, len(raw))
    p, chunks = 12, []
    while p < len(raw):
        clen, ctype = struct.unpack('<I', raw[p:p + 4])[0], raw[p + 4:p + 8]
        assert clen % 4 == 0, 'chunk %r nao alinhado em 4' % ctype
        chunks.append((ctype, raw[p + 8:p + 8 + clen]))
        p += 8 + clen
    assert [c[0] for c in chunks] == [b'JSON', b'BIN\x00'], 'ordem/tipo dos chunks'
    g = json.loads(chunks[0][1].decode('utf-8'))
    binl = len(chunks[1][1])
    assert g['buffers'][0]['byteLength'] <= binl, 'buffer maior que o BIN'
    tam_comp = {5123: 2, 5126: 4}
    num_comp = {'SCALAR': 1, 'VEC3': 3}
    for i, a in enumerate(g['accessors']):
        bv = g['bufferViews'][a['bufferView']]
        preciso = a['count'] * tam_comp[a['componentType']] * num_comp[a['type']]
        assert preciso <= bv['byteLength'], 'accessor %d estoura a bufferView' % i
        assert bv['byteOffset'] % tam_comp[a['componentType']] == 0, 'offset desalinhado'
        assert bv['byteOffset'] + bv['byteLength'] <= binl, 'bufferView fora do BIN'
    for p_ in g['meshes'][0]['primitives']:
        assert 'POSITION' in p_['attributes'], 'primitiva sem POSITION'
        assert g['accessors'][p_['indices']]['count'] % 3 == 0, 'indices nao multiplos de 3'
    tris = sum(g['accessors'][p_['indices']]['count'] // 3 for p_ in g['meshes'][0]['primitives'])
    alt = max(a['max'][1] for a in g['accessors'] if 'max' in a)
    return len(raw), len(g['meshes'][0]['primitives']), tris, alt


FIGURAS = {
    'jogador': dict(
        manga_na_camisa=False, luva_grande=False,
        cores={'camisa': '#1F6FEB', 'short': '#E9EDF2', 'meiao': '#11305E',
               'chuteira': '#14181D', 'pele': '#C68642', 'cabelo': '#2B2118',
               'luva': '#C68642'}),
    'adversario': dict(
        manga_na_camisa=False, luva_grande=False,
        cores={'camisa': '#E2483C', 'short': '#1B1F24', 'meiao': '#7A1F18',
               'chuteira': '#14181D', 'pele': '#8D5524', 'cabelo': '#15110D',
               'luva': '#8D5524'}),
    'goleiro': dict(
        manga_na_camisa=True, luva_grande=True,
        cores={'camisa': '#F6C21C', 'short': '#1B1F24', 'meiao': '#C79A0E',
               'chuteira': '#14181D', 'pele': '#C68642', 'cabelo': '#3A2A1C',
               'luva': '#15C27A'}),
}

BRILHO = {'chuteira': 0.35, 'luva': 0.5, 'camisa': 0.8, 'short': 0.8, 'pele': 0.9}


def main():
    os.makedirs(OUT, exist_ok=True)
    for nome, cfg in FIGURAS.items():
        grupos = corpo(cfg['manga_na_camisa'], cfg['luva_grande'])
        glb = build_glb(nome, grupos, cfg['cores'], BRILHO)
        caminho = os.path.join(OUT, nome + '.glb')
        with open(caminho, 'wb') as f:
            f.write(glb)
        tam, prims, tris, alt = conferir(caminho)
        print('%-11s %6d bytes  %d primitivas  %4d triangulos  altura %.2f  OK'
              % (nome + '.glb', tam, prims, tris, alt))


if __name__ == '__main__':
    main()
