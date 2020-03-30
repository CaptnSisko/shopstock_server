import json, os, mysql.connector

# must be run after import_chains.py

folder = 'chains_gps/'

secret_json = json.loads(open('secret.json').read())
db_user = secret_json['db_user']
db_pass = secret_json['db_pass']

db = mysql.connector.connect(
    host='localhost',
    user=db_user,
    passwd=db_pass,
    database='shopstock'
)

cursor = db.cursor()

# for now, assume everything is a grocery store

for file_name in os.listdir(folder):
    chain_name = file_name.replace('-', ' ')[:-4]
    cursor.execute("SELECT id FROM chain_lookup WHERE name='" + chain_name + "'")
    result = cursor.fetchall()
    try:
        chain_id = result[0][0]
        category_id = 1
        used_names = []
        used_addresses = []
        for line in open(folder + file_name).read().split('\n'):
            line = line.strip()
            address = line.split('*****')[0]
            town = address.split(',')[1].strip()
            coords = line.split('*****')[1].split(',')
            lat = float(coords[0])
            lng = float(coords[1])
            if address in used_addresses: continue

            name = town + ' ' + chain_name
            if name in used_names:
                name += ' #2'
            while name in used_names:
                name = '#'.join(name.split('#')[:-1]+[str(int(name.split('#')[-1])+1)])
            try:
                cursor.execute("INSERT INTO store_lookup VALUES (NULL, %s,%s,%s,%s,%s,%s)", (name, address, lat, lng, category_id, chain_id))
                print('Added ' + name + ' to db')
                
            except mysql.connector.errors.IntegrityError:
                print(name + ' is already in the database')
            used_names += [name]
            used_addresses += [address]
            
    except IndexError:
        print('Could not find ' + chain_name + ' in chain_lookup table!')
    
    
db.commit()
