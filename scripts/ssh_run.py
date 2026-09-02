#!/usr/bin/env python3
"""通过 paramiko 连接软路由执行命令。
凭据：优先 SSH 密钥（~/.ssh），无密钥时用环境变量 ROUTER_PASS 的密码。
禁止在代码中硬编码密码。
"""

import os
import paramiko
import sys


def run_cmd(host, user, cmd, timeout=600):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    password = os.environ.get("ROUTER_PASS")
    key_path = os.path.expanduser("~/.ssh/id_router")
    pkey = None
    if os.path.isfile(key_path):
        try:
            pkey = paramiko.Ed25519Key(filename=key_path)
        except Exception:
            try:
                pkey = paramiko.RSAKey(filename=key_path)
            except Exception:
                pkey = None
    try:
        if password:
            c.connect(host, username=user, password=password, timeout=10)
        elif pkey is not None:
            c.connect(host, username=user, pkey=pkey, timeout=10)
        else:
            c.connect(host, username=user, timeout=10)
    except paramiko.AuthenticationException:
        if password or pkey is not None:
            raise
        raise SystemExit(
            "SSH key auth failed and ROUTER_PASS is not set. "
            "Export ROUTER_PASS or set up an SSH key."
        )
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout, get_pty=True)
    while not stdout.channel.exit_status_ready():
        line = stdout.readline()
        if line:
            print(line, end="")
        err_line = stderr.readline()
        if err_line:
            print(err_line, end="")
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out, end="")
    if err:
        print(err, end="")
    rc = stdout.channel.recv_exit_status()
    c.close()
    return rc


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[-1].isdigit():
        timeout = int(sys.argv[-1])
        cmd = " ".join(sys.argv[1:-1])
    else:
        timeout = 600
        cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "echo SSH_WORKS"
    rc = run_cmd("192.168.3.100", "root", cmd, timeout)
    sys.exit(rc)
