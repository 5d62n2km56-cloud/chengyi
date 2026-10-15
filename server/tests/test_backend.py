from datetime import timedelta
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.config import Settings
from app.db import Base
from app.main import create_app
from app.models import HeritageItem, Message, ModelCall, VisitorSession, utcnow
from app.seed import seed_demo


def configuration(tmp_path, **kwargs):
    values = dict(database_url="sqlite:///" + str(tmp_path / "test.db"),
                  admin_password="test-only-password-123", secret_key="test-secret-" * 5,
                  seed_demo_data=False, cors_origins=["http://localhost:5173"])
    values.update(kwargs)
    return Settings(_env_file=None, **values)


@pytest.fixture
def backend(tmp_path):
    app = create_app(configuration(tmp_path), configuration_path=tmp_path / ".env",
                     model_transport=httpx.MockTransport(lambda request: httpx.Response(200,
                         text='data: {"choices":[{"delta":{"content":"连接成功"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')))
    Base.metadata.create_all(app.state.engine)
    with app.state.db_factory() as db:
        seed_demo(db)
    with TestClient(app) as client:
        yield app, client


def session(client, **body):
    result = client.post("/api/v1/sessions", json=body)
    assert result.status_code == 201, result.text
    data = result.json()["data"]
    return data["session"]["id"], {"X-Session-Token": data["session_token"]}


def interact(client, sid, headers, **body):
    return client.post("/api/v1/sessions/" + sid + "/interact", headers=headers, json=body)


def admin_headers(client):
    result = client.post("/api/v1/admin/login", json={"username": "admin", "password": "test-only-password-123"})
    assert result.status_code == 200
    return {"Authorization": "Bearer " + result.json()["data"]["access_token"]}


def test_lightweight_item_hotspot_and_question(backend):
    app, client = backend
    sid, headers = session(client, item_id="paper-cutting")
    first = interact(client, sid, headers, event="explain").json()["data"]
    assert first["mode"] == "demo" and first["actions"] == []
    assert "tour_id" not in first["session"] and "position" not in first["session"]
    hotspot = interact(client, sid, headers, event="hotspot", hotspot_id="pattern").json()["data"]
    assert hotspot["actions"] == [{"type": "highlight", "target": "pattern"}]
    assert hotspot["session"]["current_hotspot_id"] == "pattern"
    answer = interact(client, sid, headers, event="ask", question="这个有什么作用？").json()["data"]
    assert "不能完成自由问答" in answer["text"]
    assert any(s["id"] == "hotspot:pattern" for s in answer["sources"])
    assert answer["actions"] == []
    switched = interact(client, sid, headers, event="explain", item_id="shadow-puppet").json()["data"]
    assert switched["session"]["current_hotspot_id"] is None
    assert client.get("/health").json()["data"]["version"] == "0.2.0"
    assert client.get("/api/v1/tours").status_code == 404
    assert client.get("/api/v1/admin/status", headers=admin_headers(client)).status_code == 404
    assert interact(client, sid, headers, event="next").status_code == 422



def test_visitor_cannot_access_other_session(backend):
    _, client = backend
    sid, headers = session(client, item_id="paper-cutting")
    _, another = session(client)
    for auth in ({}, another, {"X-Session-Token": "wrong"}):
        assert client.get("/api/v1/sessions/" + sid, headers=auth).status_code == 404
        assert interact(client, sid, auth, event="explain").status_code == 404
    assert client.get("/api/v1/sessions/" + sid, headers=headers).status_code == 200


def test_expired_session(backend):
    app, client = backend
    sid, headers = session(client)
    with app.state.db_factory() as db:
        value = db.get(VisitorSession, sid)
        value.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/v1/sessions/" + sid, headers=headers).status_code == 410


def test_bad_event_does_not_change_state(backend):
    _, client = backend
    sid, headers = session(client, item_id="paper-cutting")
    result = interact(client, sid, headers, event="hotspot", item_id="shadow-puppet", hotspot_id="missing")
    assert result.status_code == 404
    state = client.get("/api/v1/sessions/" + sid, headers=headers).json()["data"]
    assert state["current_item_id"] == "paper-cutting"
    assert state["current_hotspot_id"] is None and state["turn_count"] == 0
    assert interact(client, sid, headers, event="ask").status_code == 422
    assert interact(client, sid, headers, event="next", item_id="paper-cutting").status_code == 422
    assert interact(client, sid, headers, event="explain", unexpected="value").status_code == 422





def test_admin_content_and_publish_rules(backend):
    _, client = backend
    assert client.get("/api/v1/admin/items").status_code == 401
    assert client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrong"}).status_code == 401
    headers = admin_headers(client)
    payload = {"id": "test-item", "name": "测试作品", "category": "传统美术", "summary": "摘要",
               "introduction": "介绍", "hotspots": [], "knowledge": [], "published": False}
    assert client.post("/api/v1/admin/items", headers=headers, json=payload).status_code == 201
    assert client.get("/api/v1/items/test-item").status_code == 404
    assert client.post("/api/v1/admin/items", headers=headers, json=payload).status_code == 409
    payload["published"] = True
    assert client.put("/api/v1/admin/items/test-item", headers=headers, json=payload).status_code == 200
    sid, visitor = session(client, item_id="test-item")
    assert interact(client, sid, visitor, event="explain").status_code == 200
    payload["published"] = False
    client.put("/api/v1/admin/items/test-item", headers=headers, json=payload)
    assert interact(client, sid, visitor, event="explain").status_code == 404



def test_invalid_or_unsafe_content(backend):
    _, client = backend
    headers = admin_headers(client)
    value = client.get("/api/v1/admin/items", headers=headers).json()["data"][0]
    value["hotspots"][0]["action_type"] = "run_javascript"
    assert client.put("/api/v1/admin/items/" + value["id"], headers=headers, json=value).status_code == 422
    value["hotspots"][0]["action_type"] = "highlight"
    value["image_url"] = "javascript:alert(1)"
    assert client.put("/api/v1/admin/items/" + value["id"], headers=headers, json=value).status_code == 422


def parse_sse(body):
    events = []
    for block in body.split("\n\n"):
        lines = block.splitlines()
        name = next((line[7:] for line in lines if line.startswith("event: ")), None)
        payload = next((line[6:] for line in lines if line.startswith("data: ")), None)
        if name and payload:
            events.append((name, json.loads(payload)))
    return events


def test_stream_matches_committed_result(backend):
    _, client = backend
    sid, headers = session(client, item_id="paper-cutting")
    response = client.post("/api/v1/sessions/" + sid + "/interact/stream", headers=headers, json={"event": "explain"})
    assert response.status_code == 200
    events = parse_sse(response.text)
    assert events[0][0] == "start" and events[-1][0] == "result"
    assert "".join(d["text"] for name, d in events if name == "delta") == events[-1][1]["text"]
    assert events[-1][1]["session"]["turn_count"] == 1


def live_backend(tmp_path, handler, fallback=True):
    settings = configuration(tmp_path, llm_mode="live", llm_api_base_url="https://model.example/v1",
                             llm_api_key="test-api-key", llm_model="test-model", llm_fallback_enabled=fallback)
    app = create_app(settings, model_transport=httpx.MockTransport(handler), configuration_path=tmp_path / ".env")
    Base.metadata.create_all(app.state.engine)
    with app.state.db_factory() as db:
        seed_demo(db)
    return app


def test_real_provider_protocol_and_conversation_memory(tmp_path):
    requests = []
    def handler(request):
        assert str(request.url) == "https://model.example/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-api-key"
        body = json.loads(request.content)
        requests.append(body)
        lines = ["data: " + json.dumps({"choices": [{"delta": {"content": text}}]}, ensure_ascii=False)
                 for text in ["这是", "测试讲解。"]]
        lines.append('data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":123,"completion_tokens":8}}')
        lines.append("data: [DONE]")
        return httpx.Response(200, text="\n\n".join(lines) + "\n\n", headers={"Content-Type": "text/event-stream"})
    app = live_backend(tmp_path, handler)
    with TestClient(app) as client:
        sid, headers = session(client, item_id="paper-cutting")
        first = interact(client, sid, headers, event="explain").json()["data"]
        assert first["text"] == "这是测试讲解。" and first["mode"] == "live"
        assert first["usage"] == {"prompt_tokens": 123, "completion_tokens": 8}
        interact(client, sid, headers, event="ask", question="再讲详细一点")
        assert any(m["role"] == "assistant" and m["content"] == first["text"] for m in requests[-1]["messages"])
        interact(client, sid, headers, event="explain", item_id="shadow-puppet")
        assert not any(m["role"] == "assistant" for m in requests[-1]["messages"])


@pytest.mark.parametrize("failure", ["http", "timeout", "invalid", "truncated"])
def test_provider_failures_are_explicit_and_reset_partial_text(tmp_path, failure):
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("secret provider detail", request=request)
        if failure == "http":
            return httpx.Response(401, text="secret provider detail")
        if failure == "invalid":
            return httpx.Response(200, text="data: invalid\n\n")
        return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"半句话"}}]}\n\n')
    app = live_backend(tmp_path, handler)
    with TestClient(app) as client:
        sid, headers = session(client, item_id="paper-cutting")
        response = client.post("/api/v1/sessions/" + sid + "/interact/stream", headers=headers, json={"event": "explain"})
        events = parse_sse(response.text)
        assert any(name == "reset" for name, _ in events)
        result = events[-1][1]
        assert result["mode"] == "fallback" and result["provider_error"]
        assert "secret provider detail" not in response.text
        assert "半句话" not in result["text"]


def test_provider_failure_without_fallback_rolls_back_progress(tmp_path):
    app = live_backend(tmp_path, lambda request: httpx.Response(503), fallback=False)
    with TestClient(app) as client:
        sid, headers = session(client, item_id="paper-cutting")
        response = interact(client, sid, headers, event="explain")
        assert response.status_code == 503
        value = client.get("/api/v1/sessions/" + sid, headers=headers).json()["data"]
        assert value["current_item_id"] == "paper-cutting" and value["turn_count"] == 0
        with app.state.db_factory() as db:
            assert db.scalars(select(Message)).all() == []
            assert db.scalars(select(ModelCall)).first().mode == "error"


def test_unreviewed_knowledge_not_sent_to_provider(tmp_path):
    bodies = []
    def handler(request):
        bodies.append(json.loads(request.content))
        return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"回答"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')
    app = live_backend(tmp_path, handler)
    with TestClient(app) as client:
        headers = admin_headers(client)
        item = client.get("/api/v1/admin/items", headers=headers).json()["data"][0]
        item["knowledge"] = [{"title": "未审核", "content": "unreviewed-secret-fact", "source_name": "未知", "reviewed": False}]
        client.put("/api/v1/admin/items/" + item["id"], headers=headers, json=item)
        sid, visitor = session(client, item_id=item["id"])
        interact(client, sid, visitor, event="ask", question="有什么资料")
        assert "unreviewed-secret-fact" not in json.dumps(bodies)





def test_login_rate_limit_and_cors(backend):
    _, client = backend
    for _ in range(10):
        assert client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrong"}).status_code == 401
    assert client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrong"}).status_code == 429
    response = client.options("/api/v1/sessions", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "X-Session-Token"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in client.get("/health", headers={"Origin": "https://untrusted.example"}).headers


def test_configuration_requires_real_key_only_in_live_mode(tmp_path):
    assert configuration(tmp_path).llm_mode == "demo"
    with pytest.raises(ValueError):
        configuration(tmp_path, llm_mode="live")
    with pytest.raises(ValueError):
        configuration(tmp_path, environment="production", seed_demo_data=True)


def test_model_setup_persists_and_changes_runtime_without_returning_key(backend):
    from pathlib import Path
    import stat
    app, client = backend
    headers = admin_headers(client)
    payload = {"api_base_url": "https://model.example/v1", "model": "test-model", "api_key": "private-test-key"}
    assert client.put("/api/v1/admin/model", json=payload).status_code == 401
    response = client.put("/api/v1/admin/model", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    assert "private-test-key" not in response.text
    assert response.json()["data"]["key_configured"] is True
    assert client.get("/health").json()["data"]["llm_mode"] == "live"
    path = Path(app.state.configuration_path)
    assert "private-test-key" in path.read_text()
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    result = client.post("/api/v1/admin/model/test", headers=headers, json={})
    assert result.status_code == 200 and result.json()["data"]["connected"]
    assert client.get("/api/v1/admin/model", headers=headers).json()["data"]["verification"] == "verified"
    sid, visitor = session(client, item_id="paper-cutting")
    answer = interact(client, sid, visitor, event="ask", question="讲讲这件作品").json()["data"]
    assert answer["mode"] == "live"


def test_model_config_invalid_values_do_not_replace_existing_config(backend):
    app, client = backend
    headers = admin_headers(client)
    payload = {"api_base_url": "https://model.example/v1", "model": "test-model", "api_key": "private-test-key"}
    client.put("/api/v1/admin/model", headers=headers, json=payload)
    for invalid in [dict(payload, api_base_url="http://model.example/v1"),
                    dict(payload, api_base_url="https://model.example/v1/chat/completions"),
                    dict(payload, api_key="invalid\nkey")]:
        assert client.put("/api/v1/admin/model", headers=headers, json=invalid).status_code == 422
    assert app.state.settings.llm_api_key.get_secret_value() == "private-test-key"
    assert client.put("/api/v1/admin/model", headers=headers, json={
        "api_base_url": "https://another.example/v1", "model": "other-model"
    }).status_code == 422
    assert client.put("/api/v1/admin/model", headers=headers, json={
        "api_base_url": "https://model.example/v1", "model": "another-model"
    }).status_code == 200
    assert app.state.settings.llm_api_key.get_secret_value() == "private-test-key"


def test_model_probe_reports_provider_failure_without_demo_success(tmp_path):
    app = live_backend(tmp_path, lambda request: httpx.Response(401, text="private-provider-detail"))
    with TestClient(app) as client:
        headers = admin_headers(client)
        response = client.post("/api/v1/admin/model/test", headers=headers, json={})
        assert response.status_code == 503 and "private-provider-detail" not in response.text
        status = client.get("/api/v1/admin/model", headers=headers).json()["data"]
        assert status["verification"] == "failed" and status["last_error"] == "provider_http_401"


def test_hotspot_followup_context_sent_to_live_model_and_cleared_on_switch(tmp_path):
    bodies = []
    def handler(request):
        bodies.append(json.loads(request.content))
        return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"回答"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')
    app = live_backend(tmp_path, handler)
    with TestClient(app) as client:
        sid, visitor = session(client, item_id="shadow-puppet")
        interact(client, sid, visitor, event="hotspot", hotspot_id="joint")
        reply = interact(client, sid, visitor, event="ask", question="这个有什么作用？").json()["data"]
        assert reply["actions"] == [] and reply["session"]["current_hotspot_id"] == "joint"
        assert "活动关节" in bodies[-1]["messages"][-1]["content"]
        assert "物品部位资料" in bodies[-1]["messages"][1]["content"]
        interact(client, sid, visitor, event="explain", item_id="bamboo-weaving")
        last = interact(client, sid, visitor, event="ask", question="这个有什么特点？").json()["data"]
        assert last["session"]["current_hotspot_id"] is None
        assert "活动关节" not in json.dumps(bodies[-1], ensure_ascii=False)
import asyncio


def test_overlapping_model_requests_commit_one_turn_and_log_both(tmp_path):
    async def scenario():
        ready = asyncio.Event()
        started = 0

        async def handler(request):
            nonlocal started
            started += 1
            if started == 2:
                ready.set()
            await ready.wait()
            return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"并发回答"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')

        app = live_backend(tmp_path, handler)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            result = (await client.post("/api/v1/sessions", json={"item_id": "paper-cutting"})).json()["data"]
            sid = result["session"]["id"]
            headers = {"X-Session-Token": result["session_token"]}
            replies = await asyncio.wait_for(asyncio.gather(*[
                client.post("/api/v1/sessions/" + sid + "/interact", headers=headers, json={"event": "explain"})
                for _ in range(2)
            ]), timeout=5)
            assert sorted(r.status_code for r in replies) == [200, 409]
            state = (await client.get("/api/v1/sessions/" + sid, headers=headers)).json()["data"]
            assert state["current_item_id"] == "paper-cutting" and state["turn_count"] == 1
            with app.state.db_factory() as db:
                assert len(db.scalars(select(Message)).all()) == 2
                calls = db.scalars(select(ModelCall)).all()
                assert len(calls) == 2
                assert {call.mode for call in calls} == {"live", "error"}
        app.state.engine.dispose()

    asyncio.run(scenario())
