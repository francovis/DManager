const 	{ app, BrowserWindow, ipcMain, Tray, nativeImage } = require('electron'),
		{ spawn } = require('child_process'),
		icon = nativeImage.createFromPath('assets/icon.png');
		
app.whenReady().then(createWindow);

function createWindow(){
	const win = new BrowserWindow({
		width: 800,
		icon: icon,
		useContentSize: true,
		titleBarStyle: 'hidden',
		transparent: true,
		resizable: false,
		webPreferences: {
			preload: require('path').join(__dirname, 'preload.js')
		}
	});
	bindEvents(win);
}
function bindEvents(win){
	let picker, macrosProcess, tray = new Tray(icon);
	win.loadFile('index.html');
	win.once('ready-to-show', () => win.show());
	
	tray.on('click', () => { 
		if (!picker){
			win.show();
		}
	});
	
	ipcMain.once('close-app',() =>{
		tray.destroy();
		app.quit();
	});
	
	ipcMain.on('reduce-app',() => {
		win.hide();
	});
	
	ipcMain.on('open-pos-picker', event => {
		win.hide();
		picker = new BrowserWindow({
			icon: icon,
			titleBarStyle: 'hidden',
			transparent: true,
			resizable: false,
			webPreferences: {
				preload: require('path').join(__dirname, 'preload.js')
			},
		});
		picker.mainEvent = event;
		picker.loadFile('html/pos-picker.html');
		picker.once('ready-to-show', () =>{
			picker.show();
			picker.maximize();
		});
	});
	
	ipcMain.on('close-pos-picker', (event,x,y) => {
		win.show();
		picker.mainEvent.reply('trigger-waiting-callback',{x, y});
		picker.close();
		picker = null;
	});
	
	ipcMain.on('start-macros', () => {		
		callback = () => macrosProcess = spawn('python', ['macros.py'],{cwd: 'py_process', detached: true});
		if (macrosProcess){
			const killer = spawn('taskkill', ['/pid', macrosProcess.pid, '/f', '/t']);
			killer.on('close', callback);
		}
		else{	
			callback();
		}
	});
	
	ipcMain.on('launch-accounts', () => {
		spawn('python', ['accounts.py'],{cwd: 'py_process'});
	});
	
	ipcMain.on('console', () => {
		if (win.webContents.isDevToolsOpened()){
			win.webContents.closeDevTools();
		}
		else{
			win.webContents.openDevTools();
		}
	});
}