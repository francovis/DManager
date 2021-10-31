from pynput.mouse import Button
from pynput.keyboard import Key
from time import sleep
from threading import Thread
from pyautogui import locateOnScreen

import re

class MacroInterpreter():
	# repeat\[[^\]]+[^\[]+\]
	# a+b+c+repeat[5:d+e+f+delay:.5]+repeat[2:repeat[3:g+h+i+delay:.5]]+sentence:la sentence mdrrrr+i+k+l
	def __init__(self, stringSequence, mouse, keyboard, triggerKey = None, rep = 1, callback = None, isMain=False):
		self.originalSequence = stringSequence
		self.rep = rep
		self.mouse = mouse
		self.initialMousePosition = mouse.position
		self.keyboard = keyboard
		self.stack = None
		self.stillAlive = False
		self.triggerKey = triggerKey
		self.callback = callback
		self.isMain=isMain
		self.isInfinite = re.match('^infinite:', stringSequence) is not None
		if not self.isInfinite:
			self.__deserialize(stringSequence)

	def __deserialize(self, stringSequence):
		repeatSequence = re.findall('repeat\[[^\]]+[^\[]+\]', stringSequence)
		self.stack = 'SUB_SEQUENCE'.join(re.split('repeat\[[^\]]+[^\[]+\]', stringSequence)).split('+')
		index = 0
		for partIndex in range(len(self.stack)):
			if self.stack[partIndex] == 'SUB_SEQUENCE':
				rep = int(repeatSequence[index][7])
				self.stack[partIndex] = MacroInterpreter(repeatSequence[index][len('repeat[x:'):-1], self.mouse, self.keyboard, rep=rep)
				index+=1

	def click(self, btn = Button.left, t = 1, pos = None):
		if pos:
			self.mouse.position = pos.split(',')
		if type(btn) == str:
			btn = Button.left if  btn == '' or btn[7:] == 'left' else Button.right
		self.mouse.click(btn, int(t or 1))

	def sentence(self, str):
		self.keyboard.type(str)

	def delay(self, sec):
		sleep(float(sec))

	def combine(self, pipedKeys):
		keys = pipedKeys.split('|')
		for i in keys:
			i = i if len(i) == 1 else Key[i]
			self.keyboard.press(i)
		for i in keys:
			i = i if len(i) == 1 else Key[i]
			self.keyboard.release(i)

	def tap(self, key):
		key = key if len(key) == 1 else Key[key]
		self.keyboard.press(key)
		self.keyboard.release(key)

	def resetmousepos(self):
		self.mouse.position = self.initialMousePosition

	def infinite(self, sequence):
		self.stillAlive = True
		Thread(target=self.__infiniteThread, args = [MacroInterpreter(sequence, self.mouse, self.keyboard)]).start()

	def imgpos(self, path):
		box = locateOnScreen(path, confidence=.9)
		while box is None:
			sleep(0.01)
			box = locateOnScreen(path, confidence=.9)
		self.mouse.position = [box.left, box.top]

	def render(self):
		if self.isInfinite:
			self.infinite(self.originalSequence[9:])
		else:
			for i in range(self.rep):
				for item in self.stack:
					if isinstance(item, MacroInterpreter):
						item.render()
					elif len(item) == 1:
						self.tap(item)
					else:
						subStack = item.split(':')
						getattr(MacroInterpreter, subStack.pop(0))(self, *subStack)
		if self.isMain and not self.isInfinite:
			Thread(target=self.callback).start()

	def __infiniteThread(self, interpreter):
		while self.stillAlive:
			interpreter.render()
		Thread(target=self.callback).start()