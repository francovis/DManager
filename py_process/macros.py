from pynput.keyboard import Key, Controller as Keyboard, Listener
from pynput.mouse import Button, Controller as Mouse
from pyautogui import locateOnScreen
from subprocess import Popen, PIPE
from threading import Thread, enumerate
from Utils.interpreter import MacroInterpreter
import configLoader, time, os, sys, signal

mouse = Mouse()
keyboard = Keyboard()
config = configLoader.getConfig('macros','auto-key-config','auto-clicker-config')

def onPress(key):
	key = vars(key).get('_name_') if type(key).__name__ == 'Key' else key.char
	if config['current-macro'] and config['current-macro'].stillAlive and config['current-macro'].triggerKey == key:
		config['current-macro'].stillAlive = False
		config['current-macro'] = None
	elif not config['exclusive-thread']:
		autoClicker = config.get('auto-clicker-config') or {}
		autoKey = config.get('auto-key-config') or {}
		if (autoClicker.get('trigger-key') or '').lower() == key.lower():	
			setAutoHandler('click', autoClickHandler, [autoClicker])
		elif (autoKey.get('trigger-key') or '').lower() == key.lower():
			setAutoHandler('key', autoKeyHandler, [autoKey])
		elif config.get('macros') and config['macros'].get(key):
			config['exclusive-thread'] = True
			config['current-macro'] = MacroInterpreter(config['macros'][key], mouse, keyboard, triggerKey = key, callback=resetExclusiveThread, isMain = True)
			config['current-macro'].render()
		else:
			return False

def setAutoHandler(type, handler, args):
	config['auto-' + type + '-active'] = not config['auto-' + type + '-active']
	if config['auto-' + type + '-active']:
		config['auto-' + type + '-thread'] = Thread(
			target=handler,
			args=args
		)
		config['auto-' + type + '-thread'].start()			
	else:
		config['auto-' + type + '-thread'] = None

def autoClickHandler(autoClicker):
	mousePosition = autoClicker['custom-location-value'].split(',') if int(autoClicker.get('location')) else None
	while config['auto-click-active']:
		if mousePosition:
			mouse.position = mousePosition
		mouse.click(Button[config.get('mouse-button') or 'left'], int(autoClicker.get('click-number') or 1))
		time.sleep(float(autoClicker.get('interval') or .5))

def autoKeyHandler(autoKey):
	while config['auto-key-active']:
		tap(autoKey.get('key'), float(autoKey.get('interval') or .5))

def loadConfig():
	config['auto-key-active'] = config['auto-click-active'] = config['exclusive-thread'] = False
	config['auto-key-thread'] = config['auto-click-thread'] = config['current-macro'] = None
	if config.get('macros'):
		temp = config['macros']
		config['macros'] = {}
		for index in range(len(temp)):
			config['macros'][temp[index]['entry']] = temp[index]['result']

def createListener():
	config['listener'] = Listener(on_press=onPress)
	config['listener'].start()
	config['listener'].join()

def resetExclusiveThread():
	time.sleep(.1)
	config['exclusive-thread'] = False

if __name__ == '__main__':
	loadConfig()
	createListener()