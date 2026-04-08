#python# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [
    ('index.html', '.'),
    ('main.js', '.'),
    ('convert.js', '.'),
    (r'C:\Users\PC\AppData\Local\Programs\Python\Python310\lib\site-packages\webview', 'webview'),
]
binaries = [
    ('VTFCmd.exe', '.'),
    ('DevIL.dll', '.'),
    ('VTFLib.dll', '.'),
]
hiddenimports = [
    'webview',
    'webview.platforms.winforms',
]
tmp_ret = collect_all('jaraco.text')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


block_cipher = None


a = Analysis(
    ['skybox_gen_se.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
		'numpy',
		'PIL',
		'gunicorn',
		'setuptools._distutils.tests',
		'distutils.tests',
		'webview.platforms.cocoa',
		'webview.platforms.gtk',
		'webview.platforms.qt',
		'webview.platforms.android',
		'webview.platforms.cef',
		'tkinter', '_tkinter',
		'unittest', 'pydoc', 'doctest',
		'xmlrpc', 'ftplib', 'telnetlib',
		'curses', 'readline',
		'IPython', 'jupyter',
		'pygments',
		'pytest',
	],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='skybox_gen_se',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
