"""Tests for the FastAPI server endpoints."""

from fastapi.testclient import TestClient

from repocheck.server import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "has_openai_key" in data


class TestBrowseEndpoint:
    def test_browse_home(self):
        r = client.get("/api/browse?path=~")
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data

    def test_browse_nonexistent(self):
        r = client.get("/api/browse?path=/nonexistent/path/xyz")
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data


class TestBranchesEndpoint:
    def test_branches_bad_repo(self):
        r = client.get("/api/branches?repo=/tmp")
        assert r.status_code == 400

    def test_branches_missing_param(self):
        r = client.get("/api/branches")
        assert r.status_code == 422


class TestAnalyzeEndpoint:
    def test_analyze_bad_path(self):
        r = client.get("/api/analyze?repo=/tmp/nonexistent")
        assert r.status_code == 400

    def test_analyze_missing_param(self):
        r = client.get("/api/analyze")
        assert r.status_code == 422


class TestFrontendServing:
    def test_index_html(self):
        r = client.get("/")
        assert r.status_code == 200
        assert "<!DOCTYPE html>" in r.text
