#!/usr/bin/env python3
"""
Tavo 角色卡 UUID 生成器
为正则脚本生成符合 Tavo 要求的 UUID。

用法：
    python gen_uuid.py              # 生成 1 个 UUID
    python gen_uuid.py 5            # 生成 5 个 UUID
    python gen_uuid.py --json 3     # 生成 3 个，JSON 数组格式
"""

import sys
import uuid
import json


def gen_one() -> str:
    """生成一个 UUID 字符串。"""
    return str(uuid.uuid4())


def gen_many(n: int) -> list:
    """生成 n 个 UUID。"""
    return [gen_one() for _ in range(n)]


def main():
    args = sys.argv[1:]
    count = 1
    as_json = False

    for arg in args:
        if arg == "--json":
            as_json = True
        elif arg.isdigit():
            count = int(arg)
        elif arg in ("-h", "--help"):
            print(__doc__)
            return

    uuids = gen_many(count)

    if as_json:
        print(json.dumps(uuids, indent=2))
    elif count == 1:
        print(uuids[0])
    else:
        for u in uuids:
            print(u)


if __name__ == "__main__":
    main()
