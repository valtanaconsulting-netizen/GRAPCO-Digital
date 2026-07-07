"""
Bridge para autorizar gcloud ADC sin que se caiga la sesión.
Spawnea `gcloud auth application-default login --no-launch-browser`,
captura el URL nuevo, espera a que aparezca scripts/auth_code.txt, y
le pasa el código por stdin a gcloud.
"""
import subprocess, sys, os, time, threading
from pathlib import Path

ROOT = Path(__file__).parent
URL_FILE  = ROOT / 'auth_url.txt'
CODE_FILE = ROOT / 'auth_code.txt'
LOG_FILE  = ROOT / 'gcloud_log.txt'

# Limpiar archivos previos
for f in (URL_FILE, CODE_FILE, LOG_FILE):
    if f.exists(): f.unlink()

GCLOUD = r'C:\Users\fjros\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'

p = subprocess.Popen(
    [GCLOUD, 'auth', 'application-default', 'login', '--no-launch-browser'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    bufsize=1,
    universal_newlines=True,
    shell=False,
)

log = open(LOG_FILE, 'w', encoding='utf-8', buffering=1)
url_captured = False
prompt_seen = threading.Event()

def reader():
    """Lee stdout de gcloud, captura URL y detecta el prompt."""
    global url_captured
    buf = ''
    for line in iter(p.stdout.readline, ''):
        log.write(line); log.flush()
        if not url_captured and 'accounts.google.com/o/oauth2/auth' in line:
            url = line.strip()
            URL_FILE.write_text(url, encoding='utf-8')
            url_captured = True
            print(f'[bridge] URL nuevo guardado en {URL_FILE.name}')
        if 'verification code' in line.lower() or 'enter the' in line.lower():
            prompt_seen.set()

t = threading.Thread(target=reader, daemon=True)
t.start()

# Esperar a que aparezca el URL y el prompt
for _ in range(30):
    if url_captured and prompt_seen.is_set(): break
    time.sleep(0.5)

if not url_captured:
    print('[bridge] No se pudo capturar URL. Revisa gcloud_log.txt')
    p.terminate(); sys.exit(1)

print(f'[bridge] Esperando código en {CODE_FILE.name}... (autoriza el URL y guarda el code)')

# Esperar archivo con código
while not CODE_FILE.exists():
    if p.poll() is not None:
        print(f'[bridge] gcloud salió antes de tiempo (exit={p.returncode})')
        sys.exit(1)
    time.sleep(1)

code = CODE_FILE.read_text(encoding='utf-8').strip()
print(f'[bridge] Código recibido ({len(code)} chars), enviando a gcloud...')

try:
    p.stdin.write(code + '\n')
    p.stdin.flush()
except Exception as e:
    print(f'[bridge] Error escribiendo a gcloud stdin: {e}')

# Esperar a que gcloud termine
rc = p.wait(timeout=60)
log.close()
print(f'[bridge] gcloud exit={rc}')
sys.exit(rc)
