import json, os, mysql.connector

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

#r = cursor.execute("INSERT INTO chain_lookup VALUES (NULL, 'tes22t');")
#print(r)
for file_name in os.listdir(folder):
    chain_name = file_name.replace('-', ' ')[:-4]
    try:
        cursor.execute("INSERT INTO chain_lookup VALUES (NULL,'" + chain_name + "')");
        print('Added ' + chain_name + ' to db')
    except mysql.connector.errors.IntegrityError:
        print(chain_name + ' already exists in the database!')
    
    
db.commit()
