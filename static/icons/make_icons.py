"""iBank 应用图标生成器

用途：一条命令重出 PWA 需要的四张图标。想换配色/换形象，只改下面「可调参数」区块，
     然后运行 `python static/icons/make_icons.py`，四张图一起更新。

用法：
  python static/icons/make_icons.py

产物（均在本目录）：
  icon-192.png            purpose=any，桌面/开始菜单
  icon-512.png            purpose=any，高分屏与安装时展示
  icon-maskable-512.png   purpose=maskable，安卓会裁成圆形/水滴形，内容已收进安全区
  apple-touch-icon.png    180x180，iOS / 旧版 Edge

依赖：Pillow（pip install pillow）
"""
import os
from PIL import Image, ImageDraw

# ==================== 可调参数（想换图标只改这里）====================

COLOR_TOP = (79, 70, 229)        # 底色渐变起点：靛蓝
COLOR_BOTTOM = (37, 99, 235)     # 底色渐变终点：品牌蓝 #2563eb
COLOR_DISC = (248, 250, 255)     # 中央圆盘色（近白，衬托熊猫深色线条）

# 熊猫头部裁切框（源图 512x512，主体边界 (82,35)-(430,477)）
# 只取耳朵顶到下巴，不含举起的胳膊——否则胳膊会溢出中央圆盘下缘
HEAD_BOX = (96, 24, 432, 312)

CORNER_RADIUS_RATIO = 0.22       # 圆角半径 / 边长（Windows 图标口径约 22%）
DISC_DIAMETER_RATIO = 0.68       # 中央圆盘直径 / 边长
PANDA_WIDTH_RATIO = 0.88         # 熊猫宽度 / 圆盘直径
MASKABLE_SCALE = 0.78            # maskable 版内容收缩比例（W3C 安全区要求 ≥0.8 直径内）

# ==================================================================

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'static', 'mascot', 'panda@2x.png')
OUT = os.path.dirname(os.path.abspath(__file__))

SS = 4  # 超采样倍数：先画大图再缩小，边缘无锯齿


def vgradient(size, top, bottom):
    """竖向线性渐变。Pillow 的 linear_gradient 顶部为 0、底部为 255。"""
    mask = Image.linear_gradient('L').resize(size, Image.BICUBIC)
    return Image.composite(Image.new('RGB', size, bottom), Image.new('RGB', size, top), mask)


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def build(size, maskable=False):
    s = size * SS
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))

    # 1) 渐变底：maskable 要全出血（不留透明角），普通图标切圆角
    grad = vgradient((s, s), COLOR_TOP, COLOR_BOTTOM).convert('RGBA')
    if maskable:
        canvas.alpha_composite(grad)
    else:
        canvas.paste(grad, (0, 0), rounded_mask((s, s), int(s * CORNER_RADIUS_RATIO)))

    # 2) maskable 把内容收进中心安全区，普通图标用满
    scale = MASKABLE_SCALE if maskable else 1.0
    inner = int(s * DISC_DIAMETER_RATIO * scale)
    cx = cy = s // 2

    # 3) 中央浅色圆盘
    disc = Image.new('RGBA', (inner, inner), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse([0, 0, inner - 1, inner - 1], fill=COLOR_DISC + (255,))
    canvas.alpha_composite(disc, (cx - inner // 2, cy - inner // 2))

    # 4) 熊猫头部：等比缩放后居中略偏上，避免下巴顶到圆盘边缘
    panda = Image.open(SRC).convert('RGBA').crop(HEAD_BOX)
    target_w = int(inner * PANDA_WIDTH_RATIO)
    target_h = int(target_w * panda.size[1] / panda.size[0])
    panda = panda.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(panda, (cx - target_w // 2, cy - int(target_h * 0.55)))

    return canvas.resize((size, size), Image.LANCZOS)


def main():
    jobs = [
        ('icon-192.png', build(192)),
        ('icon-512.png', build(512)),
        ('icon-maskable-512.png', build(512, maskable=True)),
        # iOS 会自己切圆角，故用全出血版本
        ('apple-touch-icon.png', build(180, maskable=True)),
    ]
    for name, im in jobs:
        p = os.path.join(OUT, name)
        im.save(p, 'PNG', optimize=True)
        print('%-24s %4dx%-4d %7d 字节' % (name, im.size[0], im.size[1], os.path.getsize(p)))


if __name__ == '__main__':
    main()
