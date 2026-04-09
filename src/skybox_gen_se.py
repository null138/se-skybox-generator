import os
import sys
import webview
import shutil
import base64
from urllib.parse import urlparse
import subprocess
import pathlib

def resource_path(path):
	if hasattr(sys, "_MEIPASS"):
		return os.path.join(sys._MEIPASS, path)
	return os.path.join(os.path.abspath("."), path)

class Api:
	def save_all_faces(self, payload):
		face_files = payload["face_files"]
		skybox_name = payload["skybox_name"]
		vtf_options = payload["vtf_options"]

		# i hate webview bridge so much
		if getattr(sys, "frozen", False):
			base_dir = os.path.dirname(sys.executable)
		else:
			base_dir = os.path.abspath(".")
		folder = os.path.join(base_dir, "output")
		os.makedirs(folder, exist_ok=True)
		messages = []

		if not skybox_name.strip():
			return "Skybox name is empty"

		count = 0
		for face_name, img_src in face_files:
			try:
				out_path = os.path.join(folder, f"{face_name}.png")
				if img_src.startswith("data:image/"):
					_, encoded = img_src.split(",", 1)
					data = base64.b64decode(encoded)
					with open(out_path, "wb") as f:
						f.write(data)
				else:
					parsed = urlparse(img_src)
					src_path = resource_path(parsed.path.lstrip("/"))
					shutil.copy(src_path, out_path)
				count += 1
			except Exception as e:
				messages.append(f"Error saving {face_name}: {e}")
		messages.append(f"Saved {count} faces to {folder}")

		name_map = {"px": "ft", "nx": "bk", "py": "up", "ny": "dn", "pz": "rt", "nz": "lf"}
		vtfcmd_path = resource_path("VTFCmd.exe")

		for short_name in name_map:
			png_file = os.path.join(folder, f"{short_name}.png")
			if not os.path.exists(png_file):
				continue

			cmd = [vtfcmd_path, "-file", png_file]
			fmt = vtf_options.get("format", "BGR888")
			alpha_fmt = vtf_options.get("alphaFormat", "BGR888")
			cmd.extend(["-format", fmt, "-alphaformat", alpha_fmt])
			cmd.extend(["-resize",
						"-rmethod", vtf_options.get("resizeMethod", "BIGGEST"),
						"-rfilter", vtf_options.get("resizeFilter", "MITCHELL"),
						"-rsharpen", vtf_options.get("sharpenFilter", "NONE")])
			width, height = map(int, vtf_options.get("resolution", "1024x1024").split("x"))
			cmd.extend(["-rclampwidth", str(width), "-rclampheight", str(height)])

			for flag in vtf_options.get("flags", []):
				cmd.extend(["-flag", flag])

			cmd.extend(["-version", vtf_options.get("version", "7.2")])

			try:
				subprocess.run(cmd, check=True, creationflags=subprocess.CREATE_NO_WINDOW)
			except subprocess.CalledProcessError as e:
				messages.append(f"Failed to convert {png_file} to VTF: {e}")
				continue

		for old_name, new_suffix in name_map.items():
			old_vtf = os.path.join(folder, f"{old_name}.vtf")
			new_name = f"{skybox_name}{new_suffix}"
			new_vtf = os.path.join(folder, f"{new_name}.vtf")
			vmt_path = os.path.join(folder, f"{new_name}.vmt")
			png_file = os.path.join(folder, f"{old_name}.png")

			if os.path.exists(old_vtf):
				if os.path.exists(new_vtf):
					os.remove(new_vtf)
				if os.path.exists(vmt_path):
					os.remove(vmt_path)

				os.rename(old_vtf, new_vtf)
				vmt_content = f'''"UnlitGeneric"
{{
	"$basetexture" "skybox/{new_name}"
	"$nofog" 1
	"$ignorez" 1
}}
'''
				with open(vmt_path, "w") as f:
					f.write(vmt_content)

				if os.path.exists(png_file):
					try:
						os.remove(png_file)
					except Exception as e:
						messages.append(f"Failed to delete {png_file}: {e}")

				messages.append(f"{new_name}  |	 Created")

		return "\n".join(messages)

api = Api()
html_file = pathlib.Path(resource_path("index.html")).absolute().as_uri()

webview.create_window(
	"SE Skybox Generator",
	html_file,
	width=1200,
	height=900,
	resizable=False,
	js_api=api
)

webview.start(debug=False)
