import requests

if __name__ == "__main__":
    id = int(input("id: "))
    password = input("password: ")
    
    r = requests.post("http://localhost:8080/api/v1/login", json={"id": id, "password": password})
    print(r.status_code)
    print(r.json())

    if r.status_code == 200:
        token = r.json().get("token")
        r = requests.get("http://localhost:8080/api/v1/events", headers={"Authorization": f"Bearer {token}"})
        print(r.status_code)
        print(r.json())

        event_code = input("event code: ")
        r = requests.get(f"http://localhost:8080/api/v1/schedule?event={event_code}", headers={"Authorization": f"Bearer {token}"})
        print(r.status_code)
        print(r.json())