const { ipcRenderer, contextBridge } = require('electron');
const { readFile, writeFile } = require('fs');

window.addEventListener('DOMContentLoaded', () => {
	const [python, reduce, close] = document.querySelectorAll('#python-listener,#reduce,#close');
	if (close) close.addEventListener('click', function(){
		ipcRenderer.send('close-app');
	});
	if (reduce) reduce.addEventListener('click', function(){
		ipcRenderer.send('reduce-app');
	});
	if (python) python.addEventListener('click', function(){
		ipcRenderer.send('start-macros');
	});
	document.body.addEventListener('keyup', function(event){
		if (event.key.toUpperCase() === 'F12'){
			ipcRenderer.send('console');
		}
	});
});

ipcRenderer.on('trigger-waiting-callback', (event, ...args) => {
	contextBridge.waitingCallback(...args);
});

contextBridge.exposeInMainWorld('twoWayEvent', {
	'requestLocalFile': (page, callback) => {
		readFile(page, 'utf8', (err,data) => {
			callback(err ? '' : data);
		});
	},
	'saveConfig': config => {
		readFile('config.json', 'utf8', (err,data) => {
			if (!err){
				const oldConfig = data === '' ? {} : JSON.parse(data);
				Object.keys(config).forEach(key => {
					oldConfig[key] = config[key];
				});
				writeFile('config.json', new Uint8Array(Buffer.from(JSON.stringify(oldConfig))), err => {
					if(err) console.log(err);
				});
			}
		});
	},
	'getConfig': (formId, callback) => {
		readFile('config.json', 'utf8', (err,data) => {
			if (!err){
				callback((data === '' ? {} : JSON.parse(data))[formId]);
			}
		});
	},
	'openPosPicker': callback => {
		contextBridge.waitingCallback = callback;
		ipcRenderer.send('open-pos-picker');
	},
	'closePosPicker': (x, y) => ipcRenderer.send('close-pos-picker', x, y),
	'launchAccounts': () => ipcRenderer.send('launch-accounts')
});