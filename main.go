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
	Name          string `json:"name"`
	StudentsCount string `json:"count"`
}

type Node struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Group  int    `json:"group"`
	Level  int    `json:"level"`
	Cities []City `json:"data"`
}

type Link struct {
	Target   string  `json:"target"`
	Source   string  `json:"source"`
	Strength float64 `json:"strength"`
}
type Courses struct {
	Nodes []Node `json:"nodes"`
	Links []Link `json:"links"`
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan *Courses)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {

	router := mux.NewRouter()
	router.HandleFunc("/", showCourses)
	router.HandleFunc("/api", getCoursesJSON)
	router.HandleFunc("/api/json", postJSONData)
	router.HandleFunc("/echo", wsHandler)
	go echo()

	//http.ListenAndServe(":4040", nil)
	log.Fatal(http.ListenAndServe(":4040", router))
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

var courses Courses

func showCourses(w http.ResponseWriter, r *http.Request) {

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

	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()

	// read our opened jsonFile as a byte array.
	byteValue, _ := ioutil.ReadAll(jsonFile)
	/*
		var result map[string]interface{}
		json.Unmarshal([]byte(byteValue), &result)

		fmt.Println(result["cities"])
	*/

	// unmarshal byteArray
	json.Unmarshal(byteValue, &courses)
}

func getCoursesJSON(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(courses)

}

func postJSONData(rw http.ResponseWriter, req *http.Request) {

	decoder := json.NewDecoder(req.Body)
	err := decoder.Decode(&courses)
	if err != nil {
		panic(err)
	}

	for i := 0; i < len(courses.Nodes); i++ {
		log.Println("Node Name: " + courses.Nodes[i].Label)
	}

	b, err := json.Marshal(courses)
	if err != nil {
		panic(err)
	}

	err = ioutil.WriteFile("output.json", b, 0644)
	//log.Println(err)
	log.Print("Json data Received from postman.")

	go writer(&courses)
}

func writer(courses *Courses) {
	broadcast <- courses
}

func echo() {
	for {
		val := <-broadcast
		courses := fmt.Sprintf("%s", val)
		log.Println(courses)
		// send to every client that is currently connected
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, []byte(courses))
			if err != nil {
				log.Printf("Websocket error: %s", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}
