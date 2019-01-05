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
)

type City struct {
	Name       string `json:"name"`
	Population string `json:"population"`
}

type Cities struct {
	Cities []City `json:"cities"`
}

func main() {
	http.HandleFunc("/", showCities)
	http.HandleFunc("/api", getCitiesJSON)
	http.HandleFunc("/api/json", postJSONData)
	http.ListenAndServe(":4040", nil)

}

var cities Cities

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
	log.Print("Method called.")
	//readJSONFile()
}
