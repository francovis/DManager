import json
def getConfig(*keys):
    file = open('../config.json')
    storedConfig = json.load(file)
    file.close()
    if not len(keys):
        return storedConfig
    config = {}
    for key in keys:
        config[key] = storedConfig[key]
    return config