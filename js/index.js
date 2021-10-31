// TODO: possibilité de rendres les comptes inactifs, faire les macros imgpos/infinite;
const htmlObserver = new MutationObserver(function(mutations){
	if (mutations[0].target.id === 'tab-content'){
		document.querySelectorAll('form:not(.no-trigger) input,form:not(.no-trigger) select').forEach(item => item.addEventListener('change', () => saveConfig('form:not(.no-trigger)')));
		initConfigValues();
		initEvents(true);
	}
	else{
		initEvents();
	}
	htmlObserver.disconnect();
});

window.onload = () => {
	document.querySelectorAll('.tab').forEach(item => {
		item.addEventListener('click', () => {
			document.querySelectorAll('.tab').forEach(tab => tab.className = 'tab');
			item.className = 'tab active';
			load(item.dataset.page);
		});
	});
	load(document.querySelector('.active').dataset.page);
}

function load(page){
	window.twoWayEvent.requestLocalFile(page, content => {
		htmlObserver.observe(document.querySelector('#tab-content'),{childList: true});
		document.querySelector('#tab-content').innerHTML = content;
	});
}

function saveConfig(formTarget){
	window.twoWayEvent.saveConfig({
		[document.querySelector(formTarget).id]: Array.from(document.querySelectorAll(`${formTarget} input,form:not(.no-trigger) select`)).reduce( (acc,input) => {
			acc[input.name] = (input.type === 'radio' ? input.checked && input.value : input.value) || '';
			return acc;
		}, {}) 
	});
}

function initConfigValues(){
	const [activeForm, table] = [document.querySelector('form:not(.no-trigger)') ? 'form:not(.no-trigger)' : 'form.no-trigger', document.querySelector('form.no-trigger')];
	if(document.querySelector(activeForm)){
		window.twoWayEvent.getConfig(table ? table.dataset.refer : document.querySelector(activeForm).id, config => {
			if (!config) return;
			if (table){
				refreshTable(config, getKeyMap(table.dataset.refer));
			}
			else {
				document.querySelectorAll('form:not(.no-trigger) input,form:not(.no-trigger) select').forEach(input => {
					if (input.type === 'radio'){
						const radio = document.querySelector(`form:not(.no-trigger) input[name="${input.name}"][value="${config[input.name]}"]`)
						if (radio) radio.checked = true;
					}
					else{
						input.value = config[input.name];
					}
				});
			}
		});
	}
}

function initEvents(isInitialCall){
	if (isInitialCall){
		document.querySelectorAll('[data-trigger]').forEach(target => target.addEventListener(`${target.dataset.eventtype || 'click'}`, event => {
			eventPart = target.dataset.trigger.split(':');
			window[eventPart.shift()](event, ...eventPart);
		}));
	}
	document.querySelectorAll('[data-databinding]').forEach(container => {
		container.dataset.databinding.split('||').forEach(eventDefinition =>{
			const [selector, fct, eventType] = eventDefinition.split('|');
			container.querySelectorAll(selector).forEach(item => {
				item.removeEventListener(`${eventType || 'click'}`, window[fct]);
				item.addEventListener(`${eventType || 'click'}`, window[fct]);
			});
		});
	});
}

function showInvisible(){
	document.querySelectorAll('.invisible').forEach(item => item.className = item.className.replace('invisible','visible'));
}

function hideInvisible(){
	document.querySelectorAll('.visible').forEach(item => item.className = item.className.replace('visible','invisible'));	
}

function saveForm(){
	try {
		const newEntry = Array.from(document.querySelectorAll('form.no-trigger input,form.no-trigger select'))
			.reduce( (acc,input) => {
				if (!input.value) throw new Error(`${input.name} is required`);	
				acc[input.name] = input.value;
				return acc;
			}, {});
		const dataset = document.querySelector('form.no-trigger').dataset;
		const keyMap = getKeyMap(dataset.refer);
		let entries = getEntries(dataset.refer,keyMap);
		if (document.querySelectorAll('tr.in-edition').length){
			entries.some(entry => {
				if (entry.isEdited){
					Object.assign(entry, newEntry);
				}
				return entry.isEdited;
			});
		}
		else{
			if (entries.some(entry => entry[dataset.id] === newEntry[dataset.id])){
				throw new Error(`Object ID already assign (${dataset.id})`);
			}
			entries.push(newEntry);
		}
		saveAlterTable(entries, keyMap);
	}
	catch(exception){
		showErrorMessage(exception.message);
	}
}

function getKeyMap(htmlId){
	return Array.from(document.querySelectorAll(`#${htmlId} thead th`))
		.map(item => item.dataset.key);
}
function getEntries(htmlId, keyMap){
	return Array.from(document.querySelectorAll(`#${htmlId} tbody tr`)).map(
		tr => {
			const entry = Array.from(tr.querySelectorAll('td')).reduce((acc,td,index) => {
				if (keyMap[index]) acc[keyMap[index]] = td.innerText.trim();
				return acc;
			},{});
			entry.isEdited = /in-edition/g.test(tr.className);
			return entry;
		}
	);
}

function saveAlterTable(entries, keyMap){
	window.twoWayEvent.saveConfig({
		[document.querySelector(`#${document.querySelector('form.no-trigger').dataset.refer}`).id]: entries
	});
	refreshTable(entries, keyMap);
	resetForm();
}

function deleteEntry(event){
	event.srcElement.parentElement.remove();
	const refer = document.querySelector('form.no-trigger').dataset.refer;
	const keyMap = getKeyMap(refer)
	saveAlterTable(getEntries(refer, keyMap), keyMap);
}

function editRow(event){
	resetForm();
	const keyMap = getKeyMap(document.querySelector('form.no-trigger').dataset.refer);
	Array.from(event.target.parentElement.children).forEach((td, index) => {
		if (keyMap[index] !== undefined){
			document.querySelector(`form.no-trigger input[name="${keyMap[index]}"]`).value = td.innerHTML.trim();
		}
	}, {});
	event.target.parentElement.className += ' in-edition';
	showInvisible();	
}

function resetForm(){
	document.querySelectorAll('form.no-trigger input').forEach(input => input.value = '');
	document.querySelectorAll('tr.in-edition').forEach(tr => tr.className = tr.className.replace(/in-edition/g,''));
	hideInvisible();
}

function refreshTable(entries, keyMap){
	if (entries){
		htmlObserver.observe(document.querySelector(`#${document.querySelector('form.no-trigger').dataset.refer} tbody`), {childList: true});
		document.querySelector(`#${document.querySelector('form.no-trigger').dataset.refer} tbody`)
			.innerHTML = entries.map(entry => {
				const cellCount = document.querySelectorAll(`#${document.querySelector('form.no-trigger').dataset.refer} th`).length;
				let tds = '';
				for (let i=0; i<cellCount; i++){
					tds += `<td>${entry[keyMap[i]] || ''}</td>`;
				}
				return `<tr>${tds}</tr>`;
		}).join('');
	}
}

function showErrorMessage(message){
	const errorZone = document.querySelector('#error-zone');
	errorZone.querySelector('span:first-child').innerText = message;
	errorZone.style.display = 'flex';
	clearTimeout(window.errorTimeout);
	window.errorTimeout = setTimeout(closeError, 5000);
}

function closeError(){
	document.querySelector('#error-zone').style.display = 'none';	
}

function drag(event){
	event.target.parentElement.style.position = 'relative';
	window.mouseMoveBound = (event2) => mouseMove(event2, event.target.parentElement);
	window.dropBound = (event2) => drop(event2, event.target.parentElement);
	document.body.addEventListener('mousemove', window.mouseMoveBound);
	document.body.addEventListener('mouseup', window.dropBound);
	document.body.addEventListener('click', window.dropBound);
}

function drop(event, element){	
	const tbody = document.querySelector('tbody');
	const relativeTr = document.querySelector('tr[style*="relative"]')
	if (tbody && relativeTr){
		const index = relativeTr.rowIndex - 1;
		const hoverChild = Math.round(((event.y - tbody.getBoundingClientRect().y)/(tbody.offsetHeight/tbody.children.length)));
		const keyMap = getKeyMap(tbody.parentElement.id);
		let entries = getEntries(tbody.parentElement.id,keyMap);
		const draggedEntry = entries[index];
		(entries = entries.filter(entry => entry !== draggedEntry)).splice(hoverChild,0,draggedEntry);
		saveAlterTable(entries, keyMap);		
	}	
	document.body.removeEventListener('mousemove', window.mouseMoveBound);
	document.body.removeEventListener('mouseup', window.dropBound);
	document.body.removeEventListener('click', window.dropBound);
	const mainTarget = element || event.target.parentElement;
	if (mainTarget){
		mainTarget.style.position = '';
		mainTarget.style.top = '0px';
		mainTarget.style.left = '0px';
	}
}

function mouseMove(event, element){
	element.style.top = `${+(element.style.top.replace('px','') || 0) + (event.movementY/devicePixelRatio)}px`;
	element.style.left = `${+(element.style.left.replace('px','') || 0) + (event.movementX/devicePixelRatio)}px`;
}

function translateTr(event){
	const dragged = document.querySelector('tr[style*="relative"]')
	if (dragged){
		const tbody = document.querySelector('tbody');
		const hoverChild = ((event.y - tbody.getBoundingClientRect().y)/(tbody.offsetHeight/tbody.children.length))+1;
		hoverElement = document.querySelector(`tbody tr:nth-child(${Math.trunc(hoverChild)})`);
		if (hoverElement && hoverElement!==dragged){
			if (hoverChild%1<0.5){
				hoverElement.className = hoverElement.rowIndex < dragged.rowIndex ? 'up' : ''; 				
			}
			else{
				hoverElement.className = hoverElement.rowIndex < dragged.rowIndex ? '' : 'down';			
			} 
		}		
	}
}

function getPos(event, inputSelector){
	twoWayEvent.openPosPicker(pos => {
		document.querySelector(inputSelector).value = `${+pos.x*devicePixelRatio},${+pos.y*devicePixelRatio}`
		if (document.querySelector('form:not(.no-trigger)')){
			saveConfig('form:not(.no-trigger)');
		}
	});
}

function launchAccounts(){
	twoWayEvent.launchAccounts()
}