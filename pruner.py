from os import listdir, remove
from os.path import isfile, join

# Getting all the file names for ./chains
file_names = [f for f in listdir('./chains') if isfile(join('./chains', f))]

# If a file is empty, delete
for name in file_names:
    delete = False
    with open('{}{}'.format('./chains/', name), 'r') as file:
        count = 0
        for i, line in enumerate(file):
            count = i + 1
        if count == 0:
            print('Deleting {}'.format(name))
            delete = True
    if delete:
        remove('./chains/{}'.format(name))

# Loop through all the non-empty stores, creating a dictionary
for name in file_names:
    path = './chains/{}'.format(name)

    # Make a properly formatted name
    modified_name = name.replace('-', ' ').replace('.txt', '')
    while modified_name[len(modified_name) - 1].isdigit():
        modified_name = modified_name[0:len(modified_name)-1]
    modified_name = modified_name.strip()

    # Make a list of the addresses for that location
    addresses = []
    with open(path, 'r') as file:
        for i, line in enumerate(file):
            addresses.append(line.rstrip())

    # Geocoding for the file 
    print(modified_name) # modified_name is the human readable version of the store name
    print(addresses)     # Addresses is a list of addresses for modified_name
