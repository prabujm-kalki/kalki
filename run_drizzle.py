import subprocess
import sys
import time

p = subprocess.Popen(['npx.cmd', 'drizzle-kit', 'generate'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

# We will read stdout and stderr, if it hangs waiting for input, we send \n
import threading

def read_out():
    while True:
        char = p.stdout.read(1)
        if not char:
            break
        sys.stdout.write(char)
        sys.stdout.flush()
        if char == '?':
            # Send newline
            p.stdin.write('\n')
            p.stdin.flush()

threading.Thread(target=read_out, daemon=True).start()

p.wait()
sys.stdout.write(p.stderr.read())
