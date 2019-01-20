package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type City struct {
	Name       string `json:"name"`
	Population string `json:"population"`
}

type Cities struct {
	Cities []City `json:"cities"`
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan *Cities)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {

	router := mux.NewRouter()
	router.HandleFunc("/", showCities)
	router.HandleFunc("/api", getCitiesJSON)
	router.HandleFunc("/api/json", postJSONData)
	/*
		router.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
			conn, _ := upgrader.Upgrade(w, r, nil) // error ignored for sake of simplicity

			for {
				// Read message from browser
				msgType, msg, err := conn.ReadMessage()
				if err != nil {
					return
				}

				// Print the message to the console
				fmt.Printf("%s sent: %s\n", conn.RemoteAddr(), string(msg))

				// Write message back to browser
				if err = conn.WriteMessage(msgType, msg); err != nil {
					return
				}
			}
		})
	*/

	router.HandleFunc("/echo", wsHandler)
	go echo()
	//http.ListenAndServe(":4040", router)
	log.Fatal(http.ListenAndServe(":4040", router))
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("ws handler is called in chart lib!")

	// register client
	clients[ws] = true
}

var cities Cities

func showCities(w http.ResponseWriter, r *http.Request) {

	readJSONFile()
	fp := path.Join("templates", "index.html")
	tmpl, err := template.ParseFiles(fp)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tmpl.Execute(w, nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func readJSONFile() {

	// Open our jsonFile
	jsonFile, err := os.Open("output.json")

	// if we os.Open returns an error then handle it
	if err != nil {
		fmt.Println(err)
	}
	// fmt.Println("Successfully Opened users.json")
	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()

	// read our opened jsonFile as a byte array.
	byteValue, _ := ioutil.ReadAll(jsonFile)
	/*
		var result map[string]interface{}
		json.Unmarshal([]byte(byteValue), &result)

		fmt.Println(result["cities"])
	*/

	// we unmarshal our byteArray which contains our
	// jsonFile's content into 'users' which we defined above
	json.Unmarshal(byteValue, &cities)

	/*
		for i := 0; i < len(cities.Cities); i++ {
			fmt.Println("City Name: " + cities.Cities[i].Name)
			fmt.Println("City Population: " + cities.Cities[i].Population)
		}
	*/

}

func getCitiesJSON(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(cities)

}

func postJSONData(rw http.ResponseWriter, req *http.Request) {

	decoder := json.NewDecoder(req.Body)
	err := decoder.Decode(&cities)
	if err != nil {
		panic(err)
	}

	for i := 0; i < len(cities.Cities); i++ {
		log.Println("City Name: " + cities.Cities[i].Name)
		log.Println("City Population: " + cities.Cities[i].Population)
	}

	b, err := json.Marshal(cities)
	if err != nil {
		panic(err)
	}

	err = ioutil.WriteFile("output.json", b, 0644)
	log.Println(err)
	log.Print("Json data Received.")

	//readJSONFile()

	go writer(&cities)
}

func writer(cities *Cities) {
	broadcast <- cities
}

func echo() {
	for {
		val := <-broadcast
		cities := fmt.Sprintf("%s", val.Cities)
		log.Println("Echo method is called!")
		// send to every client that is currently connected
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, []byte(cities))
			if err != nil {
				log.Printf("Websocket error: %s", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}
