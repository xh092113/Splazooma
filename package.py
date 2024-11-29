
import os
print(os.getcwd())

import threading
import webview
import sys

def on_closed():
    print("窗口已关闭")

if __name__ == '__main__':
    print(os.path.realpath("game/index.html"))
    window = webview.create_window('Splazoooma', os.path.realpath("game/index.html"), width=1920, height=1080, resizable=True, js_api=None)
    # window = webview.create_window('Splazoooma', os.path.realpath("game/index.html"), fullscreen=True, js_api=None)
    webview.start()