# Query Visualization

## Steps to run locally:

1. Install golang (https://golang.org/doc/install)
2. Clone the project and place it in src folder created during golang installation
3. Checkout from "feature" branch
4. Go to project directory using "cd" command
5. Run command "go run main.go" to run the server
6. Open browser, go to localhost:4000 (default port)

## Steps for real time update:

1. Execute streaming.sh script using command "sh streaming.sh" to push new data to server and see real time update

### Following folders/files are created to publish the website on url(www.viewquery.online), so they will be removed in future:

- Godeps(This folder contains the dependices required by project to run on public domain)
- Procfile
