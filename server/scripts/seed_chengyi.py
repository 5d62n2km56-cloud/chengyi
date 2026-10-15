"""登记承艺前端用到的讲解条目；可重复运行，已存在的条目按本文件更新。

承艺前端（仓库根目录）每次提问都带一个 item_id，告诉 Agent 参观者此刻在看哪里：
山河总览、某个产地的某门手艺、瓷器或剪纸工坊。编号必须与前端 js/ai/context.js 一致。

这些条目只描述网页场景，不写工艺事实；事实由 Dify 的非遗知识库检索提供。
运行：.venv/bin/python scripts/seed_chengyi.py
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings  # noqa: E402
from app.content import save_item  # noqa: E402
from app.db import build_database  # noqa: E402
from app.models import HeritageItem  # noqa: E402
from app.schemas import ItemInput  # noqa: E402

SITE = "承艺是一个非遗数字手作网站：参观者先在一幅青绿山水里按产地寻找手艺，再进入线上工坊亲手做一件作品。"
FACTS = "本条只说明网页场景；工艺、历史、材料等事实请检索非遗知识库，查不到时如实说明。"

# (编号, 名称, 类别, 地区, 场景说明)；产地条目与前端 js/data/regions.js 的 SAMPLES 对应
ITEMS = [
    ("chengyi-overview", "承艺 · 山河寻艺", "网站导览", "全国",
     SITE + "参观者正在看全国总览，地图上点亮了江西、浙江、陕西、河北、贵州、云南、北京、新疆八处产地。"
     "瓷器和剪纸可以在线创作，染织、木作、金工目前只供欣赏。"),
    ("chengyi-ceramic", "承艺 · 瓷器工坊", "传统技艺", "",
     SITE + "参观者在线上瓷器工坊，按三道简化工序做一件瓷器：选型塑坯（花瓶、碗、罐，可调器身宽窄）、"
     "施釉绘饰（釉色青绿、靛蓝、月白、暖陶；纹样素面、花卉、云纹、几何）、窑火成器。"
     "网页上的工序是示意，真实制瓷工序远比这多。"),
    ("chengyi-paper", "承艺 · 剪纸工坊", "传统美术", "",
     SITE + "参观者在线上剪纸工坊，按三道简化工序做一张剪纸：折纸定样（圆形、方形、菱形；朱红、靛蓝、米白、暖金）、"
     "剪刻纹样（素面、花卉、云纹、几何，可调繁简）、展开成作。网页上的工序是示意。"),
    ("chengyi-jiangxi-ceramic", "景德镇手工制瓷技艺", "传统技艺", "江西",
     SITE + "参观者在山河地图上选中了江西，正在看景德镇手工制瓷技艺的样品（一只月白釉青花花卉纹瓶），可以进入瓷器工坊。"),
    ("chengyi-zhejiang-ceramic", "龙泉青瓷烧制技艺", "传统技艺", "浙江",
     SITE + "参观者在山河地图上选中了浙江，正在看龙泉青瓷烧制技艺的样品（一只青绿釉素面罐），可以进入瓷器工坊。"),
    ("chengyi-zhejiang-wood", "东阳木雕", "传统美术", "浙江",
     SITE + "参观者在山河地图上选中了浙江，正在看东阳木雕的样品。木作目前只供欣赏，没有在线工坊。"),
    ("chengyi-shaanxi-paper", "安塞剪纸", "传统美术", "陕西",
     SITE + "参观者在山河地图上选中了陕西，正在看安塞剪纸的样品（一张朱红圆形团花），可以进入剪纸工坊。"),
    ("chengyi-hebei-paper", "蔚县剪纸", "传统美术", "河北",
     SITE + "参观者在山河地图上选中了河北，正在看蔚县剪纸的样品（一张朱红方形云纹窗花），可以进入剪纸工坊。"),
    ("chengyi-guizhou-textile", "苗族蜡染技艺", "传统技艺", "贵州",
     SITE + "参观者在山河地图上选中了贵州，正在看苗族蜡染技艺的样品。染织目前只供欣赏，没有在线工坊。"),
    ("chengyi-yunnan-wood", "剑川木雕", "传统美术", "云南",
     SITE + "参观者在山河地图上选中了云南，正在看剑川木雕的样品。木作目前只供欣赏，没有在线工坊。"),
    ("chengyi-beijing-metal", "景泰蓝制作技艺", "传统技艺", "北京",
     SITE + "参观者在山河地图上选中了北京，正在看景泰蓝制作技艺的样品。金工目前只供欣赏，没有在线工坊。"),
    ("chengyi-xinjiang-textile", "艾德莱斯绸织染技艺", "传统技艺", "新疆",
     SITE + "参观者在山河地图上选中了新疆，正在看艾德莱斯绸织染技艺的样品。染织目前只供欣赏，没有在线工坊。"),
]


def main():
    _, factory = build_database(Settings().database_url)
    with factory() as db:
        for item_id, name, category, region, scene in ITEMS:
            payload = ItemInput(id=item_id, name=name, category=category, region=region,
                                summary=name, introduction=scene + FACTS, published=True, is_demo=False)
            save_item(db, payload, db.get(HeritageItem, item_id))
    print("已登记承艺讲解条目 %d 个。" % len(ITEMS))


if __name__ == "__main__":
    main()
