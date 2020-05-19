import json, os, mysql.connector

secret_json = json.loads(open('../secret.json').read())
db_user = secret_json['db_user']
db_pass = secret_json['db_pass']

db = mysql.connector.connect(
    host='localhost',
    user=db_user,
    passwd=db_pass,
    database='shopstock'
)

cursor = db.cursor()

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

for category in itemsDictionary.keys():
    try:
        cursor.execute("INSERT INTO item_category_lookup VALUES (NULL,'" + category + "')")
    except mysql.connector.errors.IntegrityError:
        print('Category ' + category + ' already exists!')
        pass
    
    cursor.execute("SELECT id FROM item_category_lookup WHERE name = '" + category + "'")
    cat_id = cursor.fetchone()[0]
    print('Inserting category %s with id %d'%(category, cat_id))
    for item in itemsDictionary[category]:
        try:
            cursor.execute("INSERT INTO item_lookup VALUES (NULL,'" + item + "', " + str(cat_id) + ")")
        except mysql.connector.errors.IntegrityError:
            print('Item ' + item + ' already exists!')
            pass

db.commit()
