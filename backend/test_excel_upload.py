import requests
import os

# Test CSV upload
csv_file_path = "test_transactions.csv"

if os.path.exists(csv_file_path):
    print(f"Testing CSV upload with file: {csv_file_path}")
    
    with open(csv_file_path, 'rb') as file:
        files = {'file': ('test_transactions.csv', file, 'text/csv')}
        
        try:
            response = requests.post('http://127.0.0.1:5001/api/upload', files=files)
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.json()}")
        except Exception as e:
            print(f"Error testing upload: {e}")
else:
    print(f"Test file {csv_file_path} not found")