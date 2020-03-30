import os,json,requests,time

secret_json = json.loads(open('secret.json').read())
google_api_key = secret_json['google_api_key']
input_folder = 'chains/'
output_folder = 'chains_gps/'
api_url = 'https://maps.googleapis.com/maps/api/geocode/json?address=***ADDRESS***&key='

count = 0

for file_name in os.listdir(input_folder):
    addresses = open(input_folder + file_name).read().split('\n')
    chain_name = '-'.join(file_name.split('-')[:-1]) + '.txt'
    for address in addresses:
        output_file = open(output_folder + chain_name, 'a')
        address = address.strip()
        while '  ' in address:
            address = address.replace('  ', ' ')
        address = address.replace(' ', '+')

        if len(address) < 5: continue

        geocode = requests.get(api_url.replace('***ADDRESS***', address) + google_api_key).json()
        count += 1
        if count >= 4000:
            print('Waiting 100 seconds for Google quota to reset')
            time.sleep(100)
            count = 0
        try:
            lat = geocode['results'][0]['geometry']['location']['lat']
            lng = geocode['results'][0]['geometry']['location']['lng']
            formatted_address = geocode['results'][0]['formatted_address']
            output_file.write('%s*****%f,%f\n'%(formatted_address,lat, lng))
            print('Geocoded %s: %f,%f (count=%d)'%(formatted_address, lat, lng, count))
        except (KeyError, IndexError) as e:
            print('Could not find location of address: %s'%(address))
            pass
