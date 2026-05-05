# tests/test_chat.py

def test_chat_endpoint_exists(client):
    res = client.post("/chat", json={"message": "Olá"})
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert isinstance(data["response"], str)
    assert len(data["response"]) > 0

def test_chat_demo_pilots_question(client):
    res = client.post("/chat", json={"message": "Quantos pilotos temos?"})
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert len(data["response"]) > 0

def test_chat_empty_message_rejected(client):
    res = client.post("/chat", json={"message": ""})
    assert res.status_code == 422
