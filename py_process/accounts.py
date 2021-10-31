from pynput.keyboard import Key, Controller as Keyboard
from pynput.mouse import Button,Controller as Mouse
from pyautogui import locateOnScreen
from subprocess import Popen,PIPE
import configLoader
import time
import os
mouse = Mouse()
keyboard = Keyboard()
config = configLoader.getConfig('accounts','setting-config')
def invokeByShell():
	cmd = ['for', '/L', '%a', 'in','(','1',',','1',',',str(len(config['accounts'])),')','do','start','/max',config['setting-config']['exe-fullpath']]
	print(cmd)
	process = Popen(cmd,shell=True)
def connect():
	pseudos = []
	accountLocation = config['setting-config']['acc-name-position'].split(',')
	for account in config['accounts']:	
		mouse.position = accountLocation
		mouse.click(Button.left)
		pseudos.append(account.get('pseudo'))
		keyboard.type(account['login'])
		tap(Key.tab)
		keyboard.type(account['password'])
		tap(Key.enter)
		combine(Key.alt,Key.esc)
		time.sleep(.5)
	return pseudos
def tap(key,delay=None):
	if delay is not None:
		time.sleep(delay)
	keyboard.press(key)
	keyboard.release(key)
def clickFirst(location, accountNumber,delay=1):
	location = location
	for i in range(accountNumber):
		time.sleep(delay)
		mouse.position = location
		mouse.click(Button.left,4)
		combine(Key.alt,Key.esc)
def combine(*args):
	for i in args:
		keyboard.press(i)
	for i in args:
		keyboard.release(i)
def inviteGroup(pseudos):
	chatLocation = config['setting-config']['tchat-position'].split(',')
	okBtnGroupLocation = config['setting-config']['btn-group-position'].split(',')
	accountNumber = len(pseudos)
	for i in range(accountNumber):
		time.sleep(.5)
		mouse.position = chatLocation
		mouse.click(Button.left,2)
		keyboard.type('/invite *'+pseudos[(i+1) if i+1<accountNumber else 0])
		tap(Key.enter)
		combine(Key.alt,Key.esc)
		time.sleep(.5)
		mouse.position = okBtnGroupLocation
		mouse.click(Button.left)
def main():
	invokeByShell()
	time.sleep(1)
	pseudos = connect()
	combine(Key.cmd,Key.down)
	clickFirst(config['setting-config']['server-position'].split(','), len(pseudos))
	charPos = config['setting-config'].get('character-position')
	clickFirst((charPos if charPos is not None else config['setting-config']['server-position']).split(','), len(pseudos))
	inviteGroup(pseudos)
if __name__ == '__main__':
	main()