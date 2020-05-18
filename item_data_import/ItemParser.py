import os 

itemsDictionary = {}
with open('all-items.txt', 'r') as file:
    isCategory = True
    currentCategory = None 
    for i, line in enumerate(file):
        if isCategory:
            currentCategory = line.rstrip()
            itemsDictionary[currentCategory] = []
            isCategory = False
        elif line.rstrip() != '':
            itemsDictionary[currentCategory].append(line.rstrip())
        else:
            isCategory = True
print(itemsDictionary)
