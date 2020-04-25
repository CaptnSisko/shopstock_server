import os,json,mysql.connector,requests

input_folder = 'chunks/'
lengths = []

# see https://github.com/geolytica/geocoder/wiki/Geocoding-North-America-on-AWS-Amazon-EC2-Cloud
api_url = 'http://ec2-18-208-194-190.compute-1.amazonaws.com/?latt=**latitude**&longt=**longitude**&reverse=1&json=1'


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

for file_name in os.listdir(input_folder):
    with open(input_folder + file_name) as input_file:
        #print('Converting ' + file_name + '...')
        chunk_text = input_file.read()
        chunk_data = json.loads(chunk_text)
        error_chunks = []
        for chunk in chunk_data:
            try:
                print('Parsing ' + chunk['name'])
                geocode_call = api_url
                geocode_call = geocode_call.replace('**latitude**', str(chunk['point']['lat']))
                geocode_call = geocode_call.replace('**longitude**', str(chunk['point']['lon']))
                reverse_geocode = requests.get(geocode_call).json()['usa']
                name = chunk['name']
                address = ''
                address += reverse_geocode['usstnumber'] + ' '
                address += reverse_geocode['usstaddress'] + ' '
                address += reverse_geocode['uscity'] + ', '
                address += reverse_geocode['state'] + ' '
                address += reverse_geocode['zip']
                lat = chunk['point']['lat']
                lng = chunk['point']['lon']
                xid = chunk['xid']
                try:
                    cursor.execute("INSERT INTO store_lookup VALUES (NULL, %s,%s,%s,%s,%s)", (name, address, lat, lng, xid))
                    print('Found address for (%f, %f): %s'%(chunk['point']['lat'],chunk['point']['lon'],address))
                except mysql.connector.errors.IntegrityError:
                    print(chunk['xid'] + ' is already in the database.')
                db.commit()

            except Exception as e:
                print('Error parsing ' + chunk['xid'])
                print(e)
                error_chunks += chunk['xid']

print(error_chunks)

