# Tailscale 网络感知自动切换：在家=纯直连，在外=exit node 翻墙 + 子网路由访问家里内网
# 判定依据：默认网关是否为软路由 192.168.3.1（比 SSID 更稳，覆盖 WiFi/网线/热点改名）
$ts  = 'C:\Program Files\Tailscale\tailscale.exe'
$log = 'C:\Users\pass\.local\share\opencode\logs\tailscale-switch.log'

$gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop

if ($gw -eq '192.168.3.1') {
    & $ts set --exit-node= --accept-routes=false --accept-dns=false
    $state = 'HOME-direct'
} else {
    & $ts set --exit-node=100.97.187.104 --accept-routes=true --accept-dns=false
    $state = 'AWAY-exitnode'
}

$now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$msg = "$now gw=$gw -> $state"
Add-Content -LiteralPath $log -Value $msg
Write-Output $msg
