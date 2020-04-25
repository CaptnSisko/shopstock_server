import os,json,requests,time

output_folder = 'chunks/'
overwrite_old_generation = False

# coordinates represent bottom left coordinate of chunk
# bottom left corner of bottom left chunk
start_lat = 25
start_long = -125

# bottom left corner of top right chunk
end_lat = 48
end_long = -67


secret_json = json.loads(open('secret.json').read())
api_key = secret_json['opentripmap_api_key']

api_url = 'https://api.opentripmap.com/0.1/en/places/bbox?lon_min=***LONG_MIN***&lon_max=***LONG_MAX***&lat_min=***LAT_MIN***&lat_max=***LAT_MAX***&kinds=supermarkets&format=json&apikey=' + api_key

count = 0
for lat in range(start_lat, end_lat+1):
    for lng in range(start_long, end_long+1):
        print("Mapping Chunk (%d, %d)..."%(lat, lng))
        if not overwrite_old_generation and os.path.isfile(output_folder + str(lat) + ',' + str(lng) + '.json'):
            print('Skipping because chunk is already mapped!')
        else:
            request_url = api_url.replace('***LAT_MIN***', str(lat))
            request_url = request_url.replace('***LAT_MAX***', str(lat+1))
            request_url = request_url.replace('***LONG_MIN***', str(lng))
            request_url = request_url.replace('***LONG_MAX***', str(lng+1))

            with open(output_folder + str(lat) + ',' + str(lng) + '.json', 'w') as out_file:
                out_file.write(str(requests.get(request_url).json()))
                count += 1
        if count  >= 10:
            print('Delaying for API time limit...')
            time.sleep(1)
            count = 0

            



