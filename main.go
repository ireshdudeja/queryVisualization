package main

import (
	"html/template"
	"net/http"
	"path"
)

type City struct {
	Names      []string
	Population []int64
}

func main() {
	http.HandleFunc("/", ShowCities)
	http.ListenAndServe(":4040", nil)
}

func ShowCities(w http.ResponseWriter, r *http.Request) {
	book := City{
		[]string{"Erfurt", "Jena", "Gera", "Weimar", "Ilmenau"},
		[]int64{204994, 105129, 99262, 65479, 25984},
	}

	fp := path.Join("templates", "index.html")
	tmpl, err := template.ParseFiles(fp)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tmpl.Execute(w, book); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
