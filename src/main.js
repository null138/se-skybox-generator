const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

let finished = 0;
let workers = [];

function imageDataToURL(imageData) {
  const c = document.createElement('canvas');
  c.width = imageData.width;
  c.height = imageData.height;
  const ctx2 = c.getContext('2d');
  ctx2.putImageData(imageData, 0, 0);
  return c.toDataURL('image/png');
}

async function saveAllFaces() {
	const skyboxName = document.getElementById("skyboxName").value.trim();
	const statusDiv = document.getElementById("status");
	statusDiv.textContent = "";

	if (!skyboxName) {
		statusDiv.textContent = "❌ Enter a skybox name.";
		return;
	}

	const faceAnchors = dom.faces.querySelectorAll('div');
	if (faceAnchors.length === 0) {
		statusDiv.textContent = "❌ No faces to save. Select an image first.";
		return;
	}

	const faceFiles = Array.from(faceAnchors).map(faceAnchor => {
		const img = faceAnchor.querySelector('img');
		const faceName = faceAnchor.title;
		const src = img.dataset.full || img.src;
		return [faceName, src];
	});

	const flags = [];
	document.querySelectorAll(".vtfFlag:checked").forEach(cb => flags.push(cb.value));

	const payload = {
		face_files: faceFiles,
		skybox_name: skyboxName,
		vtf_options: {
			format: document.getElementById("formatSelect").value,
			alphaFormat: document.getElementById("alphaFormatSelect").value,
			resizeMethod: document.getElementById("resizeMethodSelect").value,
			resizeFilter: document.getElementById("resizeFilterSelect").value,
			sharpenFilter: document.getElementById("sharpenFilterSelect").value,
			resolution: document.getElementById("resolution").value,
			version: document.getElementById("version").value,
			flags: flags
		}
	};

	const saveButton = document.getElementById("saveAll");
	saveButton.disabled = true;
	saveButton.style.opacity = 0.6;

	try {
		statusDiv.textContent = "⏳ Saving faces and creating skybox...";
		await window.pywebview.ready;
		const result = await window.pywebview.api.save_all_faces(payload);
		statusDiv.textContent = `✅ ${result}`;
	} catch (err) {
		console.error(err);
		statusDiv.textContent = `❌ Error: ${err.message || err}`;
	} finally {
		saveButton.disabled = false;
		saveButton.style.opacity = 1;
	}
}

class CubeFace {
  constructor(faceName) {
	this.faceName = faceName;
	this.anchor = document.createElement('div');
	this.anchor.style.position = 'absolute';
	this.anchor.title = faceName;
	this.img = document.createElement('img');
	this.img.style.filter = 'blur(4px)';
	this.anchor.appendChild(this.img);
  }

  setPreview(url, x, y) {
	this.img.src = url;
	this.anchor.style.left = `${x}px`;
	this.anchor.style.top = `${y}px`;
	this.img.style.filter = '';
  }
}

function removeChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

const dom = {
  imageInput: document.getElementById('imageInput'),
  faces: document.getElementById('faces'),
  generating: document.getElementById('generating'),
  saveAll: document.getElementById('saveAll')
};

dom.imageInput.addEventListener('change', loadImage);
dom.saveAll.addEventListener('click', saveAllFaces);

function loadImage() {
  const file = dom.imageInput.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.addEventListener('load', () => {
	canvas.width = img.width;
	canvas.height = img.height;
	ctx.drawImage(img, 0, 0);
	const data = ctx.getImageData(0, 0, img.width, img.height);
	processImage(data);
  });
}

function processImage(data) {
  removeChildren(dom.faces);
  dom.generating.style.visibility = 'visible';

  for (let worker of workers) worker.terminate();
  workers = [];
  finished = 0;
  toolOptions.style.display = "none";

  for (let [faceName, position] of Object.entries(facePositions)) {
	renderFace(data, faceName, position);
  }
}

const facePositions = {
  pz: { x: 1, y: 1 },
  nz: { x: 3, y: 1 },
  px: { x: 2, y: 1 },
  nx: { x: 0, y: 1 },
  py: { x: 1, y: 0 },
  ny: { x: 1, y: 2 }
};

function renderFace(data, faceName, position) {
  const worker = new Worker('convert.js');

  const face = new CubeFace(faceName);
  dom.faces.appendChild(face.anchor);

  const options = {
	data: data,
	face: faceName,
	rotation: Math.PI
  };

  worker.onmessage = ({ data: imageData }) => {
	const fullUrl = imageDataToURL(imageData);
	face.img.dataset.full = fullUrl;

	const scale = 0.20; // this is aids. remind me to make it dynamic next time.
	const w = imageData.width;
	const h = imageData.height;

	const previewCanvas = document.createElement('canvas');
	previewCanvas.width = Math.round(w * scale);
	previewCanvas.height = Math.round(h * scale);
	const ctx = previewCanvas.getContext('2d');

	const img = new Image();
	img.onload = () => {
	  ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);

	  face.img.src = previewCanvas.toDataURL('image/png');

	  const x = position.x * previewCanvas.width;
	  const y = position.y * previewCanvas.height;

	  face.setPreview(face.img.src, x, y);

	  finished++;
	  if (finished === 6) {
		dom.generating.style.visibility = 'hidden';
		toolOptions.style.display = "block";
	  }
	};
	img.src = fullUrl;
  };

  worker.postMessage(options);
  workers.push(worker);
}

const realInput2 = document.getElementById("imageInput");
const customButton = document.getElementById("customFileButton");
const toolOptions = document.getElementById("toolOptions");

customButton.addEventListener("click", () => {
  realInput2.click();
});

realInput2.addEventListener("change", () => {
  if (realInput2.files.length > 0) {
	customButton.textContent = realInput2.files[0].name;
  }
});