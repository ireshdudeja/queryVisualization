package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Node struct {
	ID         string               `json:"id"`
	Label      string               `json:"label"`
	Level      int                  `json:"level"`
	Parameters map[string]Parameter `json:"parameters"`
}

type Parameter struct {
	Function      string `json:"function"`
	InitialValue  string `json:"initialValue"`
	Name          string `json:"name"`
	Visualization string `json:"visualization"`
}

type Link struct {
	Target string `json:"target"`
	Source string `json:"source"`
	//Strength float64 `json:"strength"`
}
type Query struct {
	Nodes []Node `json:"nodes"`
	Links []Link `json:"links"`
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan *Query)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var router = mux.NewRouter()

func main() {

	addr, err := determineListenAddress()
	if err != nil {
		log.Fatal(err)
	}
	readJSONFile()

	router.HandleFunc("/api", displayQueryJSONHandler)
	router.HandleFunc("/api/json", processReceivedQueryJSONHandler)
	router.HandleFunc("/modify", OperatorParametersHandler).Methods("GET")
	router.HandleFunc("/echo", wsHandler)
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))
	go echo()

	if err := http.ListenAndServe(addr, router); err != nil {
		panic(err)
	}
}

func determineListenAddress() (string, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	log.Println("Server Listening on Port Number: " + port)
	return ":" + port, nil
}

var query Query

// Reading data from json file and populate struct variable
func readJSONFile() {

	jsonFile, err := os.Open("output.json")

	// if we os.Open returns an error then handle it
	if err != nil {
		//w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		fmt.Println(err)
	}

	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()

	// read our opened jsonFile as a byte array.
	byteValue, _ := ioutil.ReadAll(jsonFile)

	var result map[string]interface{}
	json.Unmarshal([]byte(byteValue), &result)

	// unmarshal byteArray
	json.Unmarshal(byteValue, &query)

}

func OperatorParametersHandler(w http.ResponseWriter, r *http.Request) {

	v := r.URL.Query() // will get map/dict of the query string

	operatorId := v.Get("id") // Get operator ID
	idExists := false

	delete(v, "id") // delete a dict element which has key "id"

	for i, node := range query.Nodes {

		// fmt.Printf("Node name: %s\n", node.Label)

		// To check if the id entered n GET request is valid
		if node.ID == operatorId {

			// fmt.Printf("  ID exists\n")
			idExists = true

			// fmt.Printf("Value Array = %s\n", v)

			for key, value := range v {
				//fmt.Printf("KEY, VALUE! %s = %s\n", key, value)
				t := node.Parameters[key]

				lastValue := StringToFloat(t.InitialValue)
				newValue := StringToFloat(value[0])

				// fmt.Printf("Old Value: %.2f , New Value: %.2f\n", lastValue, newValue)

				switch t.Function {
				case "maximum":
					if lastValue > newValue {
						t.InitialValue = fmt.Sprintf("%.2f", lastValue)
					} else {
						t.InitialValue = fmt.Sprintf("%.2f", newValue)
					}
				case "minimum":
					if lastValue < newValue {
						t.InitialValue = fmt.Sprintf("%.2f", lastValue)
					} else {
						t.InitialValue = fmt.Sprintf("%.2f", newValue)
					}
				case "increment":
					t.InitialValue = fmt.Sprintf("%.2f", lastValue+1.0) // increment 1 in lastValue
				case "decrement":
					t.InitialValue = fmt.Sprintf("%.2f", lastValue-1.0) // decrement 1 in lastValue
				default:
					t.InitialValue = fmt.Sprintf("%.2f", newValue)
				}

				node.Parameters[key] = t
			}
			fmt.Printf("\nParamters Changed:\n %v\n", node.Parameters)
			query.Nodes[i] = node
		}

	}

	if idExists == false {
		fmt.Printf("\nOperator id doesn't exist and Paramters can't be Changed!\n")
	} else {
		b, err := json.Marshal(query)
		if err != nil {
			panic(err)
		}

		err = ioutil.WriteFile("output.json", b, 0644)
		log.Print("\n\nUpdated Paramters written")
		go writer(&query)
	}

}

func displayQueryJSONHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(query)

}

func processReceivedQueryJSONHandler(rw http.ResponseWriter, req *http.Request) {

	decoder := json.NewDecoder(req.Body)
	err := decoder.Decode(&query)
	if err != nil {
		panic(err)
	}

	for i := 0; i < len(query.Nodes); i++ {
		log.Println("Node Name: " + query.Nodes[i].Label)
	}

	b, err := json.Marshal(query)
	if err != nil {
		panic(err)
	}

	err = ioutil.WriteFile("output.json", b, 0644)
	// log.Println(err)
	// log.Print("Json data Received.")

	go writer(&query)
}

func writer(query *Query) {
	broadcast <- query
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("ws handler is called!")

	// register client
	clients[ws] = true
}

func echo() {
	for {
		val := <-broadcast
		query := fmt.Sprintf("Value from Channel: %s", val)
		//log.Println(query)
		// send to every client that is currently connected
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, []byte(query))
			if err != nil {
				log.Printf("Websocket error: %s", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func StringToFloat(input_string string) float64 {

	if s, err := strconv.ParseFloat(input_string, 64); err == nil {
		// fmt.Println(s)
		return s
	} else {
		return 0.0
	}
}

// https://stackoverflow.com/questions/41389933/when-to-use-log-over-fmt-for-debugging-and-printing-error
