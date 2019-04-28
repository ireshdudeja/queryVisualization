# Query Visualization

## Steps to run locally:
1. Install golang (https://golang.org/doc/install)
2. Clone the project and place it in src folder created during installation
3. Go to project folder
4. Run command "go run main.go"
5. Open browser, go to localhost:4040 (default port)

## Steps for real time update: 
1. Open POSTMAN app and select request type "POST" and paste the URL "http://localhost:4040/api/json"
2. Copy the data from output.json file
3. Go to body tab and paste the copied data
4. Make some changes to the values and click on send button
5. You will see the webpage will be updated with the new data.
