function clamp(x, min, max) {
  return Math.min(max, Math.max(x, min));
}

function mod(x, n) {
  return ((x % n) + n) % n;
}

function kernelResample(read, write, filterSize, kernel) {
  const {width, height, data} = read;
  const readIndex = (x, y) => 4 * (y * width + x);

  const twoFilterSize = 2 * filterSize;
  const xMax = width - 1;
  const yMax = height - 1;
  const xKernel = new Array(2 * filterSize);
  const yKernel = new Array(2 * filterSize);

  return (xFrom, yFrom, to) => {
	const xl = Math.floor(xFrom);
	const yl = Math.floor(yFrom);
	const xStart = xl - filterSize + 1;
	const yStart = yl - filterSize + 1;

	for (let i = 0; i < twoFilterSize; i++) {
	  xKernel[i] = kernel(xFrom - (xStart + i));
	  yKernel[i] = kernel(yFrom - (yStart + i));
	}

	for (let channel = 0; channel < 3; channel++) {
	  let q = 0;
	  for (let i = 0; i < twoFilterSize; i++) {
		const y = clamp(yStart + i, 0, yMax);
		let p = 0;
		for (let j = 0; j < twoFilterSize; j++) {
		  const x = clamp(xStart + j, 0, xMax);
		  p += data[readIndex(x, y) + channel] * xKernel[j];
		}
		q += p * yKernel[i];
	  }
	  write.data[to + channel] = Math.round(q);
	}
  };
}

function copyPixelLanczos(read, write) {
  const filterSize = 5;
  const kernel = x => {
	if (x === 0) return 1;
	const xp = Math.PI * x;
	return filterSize * Math.sin(xp) * Math.sin(xp / filterSize) / (xp * xp);
  };
  return kernelResample(read, write, filterSize, kernel);
}

const orientations = {
  pz: (out, x, y) => { out.x = -1; out.y = -x; out.z = -y; },
  nz: (out, x, y) => { out.x = 1; out.y = x; out.z = -y; },
  px: (out, x, y) => { out.x = x; out.y = -1; out.z = -y; },
  nx: (out, x, y) => { out.x = -x; out.y = 1; out.z = -y; },
  py: (out, x, y) => { out.x = -y; out.y = -x; out.z = 1; },
  ny: (out, x, y) => { out.x = y; out.y = -x; out.z = -1; }
};

function renderFace({data: readData, face, rotation, maxWidth = Infinity}) {
  const faceWidth = Math.min(maxWidth, readData.width / 4);
  const faceHeight = faceWidth;
  const cube = {};
  const orientation = orientations[face];
  const writeData = new ImageData(faceWidth, faceHeight);

  const copyPixel = copyPixelLanczos(readData, writeData);

  for (let x = 0; x < faceWidth; x++) {
	for (let y = 0; y < faceHeight; y++) {
	  const to = 4 * (y * faceWidth + x);
	  writeData.data[to + 3] = 255;

	  orientation(cube, 2 * (x + 0.5) / faceWidth - 1, 2 * (y + 0.5) / faceHeight - 1);

	  const r = Math.sqrt(cube.x * cube.x + cube.y * cube.y + cube.z * cube.z);
	  const lon = mod(Math.atan2(cube.y, cube.x) + rotation, 2 * Math.PI);
	  const lat = Math.acos(cube.z / r);

	  copyPixel(readData.width * lon / Math.PI / 2 - 0.5, readData.height * lat / Math.PI - 0.5, to);
	}
  }

  postMessage(writeData);
}

onmessage = function({data}) {
  renderFace(data);
};