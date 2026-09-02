# -*- coding: utf-8 -*-
"""
搜索问答工具：Tavily 搜索 -> Ollama 本地 14B 总结
用法：
  python search-answer.py "问题"
  python search-answer.py "问题" --results 5 --lang zh
说明：
  - 搜索走 Tavily API（读系统/User 环境变量 TAVILY_API_KEY）
  - 总结走本地 Ollama（http://localhost:11434/v1），模型 huihui_ai/qwen3-abliterated:14b
  - 默认关闭思考链（reasoning_effort=none），快速响应
"""

import json
import os
import sys
import urllib.request
import urllib.error

TAVILY_KEY = os.environ.get("TAVILY_API_KEY") or ""
OLLAMA_URL = "http://localhost:11434/v1/chat/completions"
OLLAMA_MODEL = "huihui_ai/qwen3-abliterated:14b"


def tavily_search(query, max_results=5, topic="general"):
    if not TAVILY_KEY:
        return None, "TAVILY_API_KEY 未设置"
    payload = {
        "api_key": TAVILY_KEY,
        "query": query,
        "max_results": max_results,
        "topic": topic,
        "search_depth": "basic",
        "include_answer": False,
    }
    req = urllib.request.Request(
        "https://api.tavily.com/search",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        return None, f"Tavily HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:200]}"
    except Exception as e:
        return None, f"Tavily error: {e}"


def format_results(data):
    lines = []
    for i, r in enumerate(data.get("results", []), 1):
        title = r.get("title", "")
        url = r.get("url", "")
        content = r.get("content", "")[:600]
        lines.append(f"{i}. {title}\n   来源: {url}\n   内容: {content}")
    return "\n\n".join(lines)


def ollama_summarize(query, results_text, lang="zh"):
    lang_hint = "用中文总结并回答" if lang == "zh" else "Summarize in English"
    sys_prompt = (
        "你是一个搜索问答助手。用户给你搜索到的网页结果，请基于这些结果回答问题。\n"
        "要求：\n"
        "1. 直接回答用户问题，简洁准确\n"
        "2. 信息来自搜索结果，不要编造\n"
        f"3. {lang_hint}\n"
        "4. 如果搜索结果与问题无关，说明没有找到相关信息\n"
        "5. 可简要列出信息来源"
    )
    user_content = f"问题：{query}\n\n以下是搜索结果：\n\n{results_text}"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_content},
        ],
        "stream": False,
        "reasoning_effort": "none",
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip(), None
    except Exception as e:
        return None, f"Ollama error: {e}"


def main():
    args = sys.argv[1:]
    if not args:
        print('用法: python search-answer.py "问题" [--results N] [--lang zh|en]')
        sys.exit(1)
    query = args[0]
    max_results = 5
    lang = "zh"
    i = 1
    while i < len(args):
        if args[i] == "--results" and i + 1 < len(args):
            max_results = int(args[i + 1])
            i += 2
        elif args[i] == "--lang" and i + 1 < len(args):
            lang = args[i + 1]
            i += 2
        else:
            i += 1

    print(f"[搜索] {query} (results={max_results})", file=sys.stderr)
    data, err = tavily_search(query, max_results)
    if err or data is None:
        print(f"[错误] {err}", file=sys.stderr)
        sys.exit(2)
    results_text = format_results(data)
    n = len(data.get("results", []))
    print(f"[找到 {n} 条结果，正在用本地模型总结...]", file=sys.stderr)

    answer, err = ollama_summarize(query, results_text, lang)
    if err:
        print(f"[错误] {err}", file=sys.stderr)
        sys.exit(3)
    print(answer)


if __name__ == "__main__":
    main()
