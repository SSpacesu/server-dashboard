import os
import psutil
import requests
import time

while True:
	uptime = os.popen("uptime -p").read().strip().removeprefix("up ")
	memory = psutil.virtual_memory()
	cpu = psutil.cpu_percent(interval=1)
	disk = psutil.disk_usage("/")
	battery = psutil.sensors_battery()

	stats = {
    		"uptime": uptime,
    		"ram_percent": memory.percent,
    		"cpu_percent": cpu,
    		"disk_percent": disk.percent,
    		"battery_percent": battery.percent if battery else None
	}

	try:
		response = requests.post(
			"http://127.0.0.1:8000/api/stats",
			json=stats,
			timeout=5
		)
		response.raise_for_status()
	except requests.RequestException as error:
		print("Could not send stats:", error)

	print(stats)
	time.sleep(1)
