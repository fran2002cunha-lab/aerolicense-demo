# tests/test_chat_tools.py
"""Validação dos argumentos das tools do chatbot (_execute_tool)."""
from chat import _execute_tool


def _tools():
    calls = {}

    def expiring(days: int = 30):
        calls["expiring"] = days
        return [{"dias": days}]

    def detail(pilot_id: str):
        calls["detail"] = pilot_id
        return {"id": pilot_id}

    def summary():
        return ["ok"]

    def broken():
        raise RuntimeError("segredo interno")

    return calls, {
        "get_expiring_documents": expiring,
        "get_pilot_detail": detail,
        "get_pilots_summary": summary,
        "get_risk_scores": broken,
    }


def test_valid_args_call_tool():
    calls, tools = _tools()
    assert _execute_tool("get_pilot_detail", '{"pilot_id": "P001"}', tools) == {"id": "P001"}
    assert calls["detail"] == "P001"


def test_default_args_applied():
    calls, tools = _tools()
    _execute_tool("get_expiring_documents", "", tools)
    assert calls["expiring"] == 30


def test_numeric_string_is_coerced():
    calls, tools = _tools()
    _execute_tool("get_expiring_documents", '{"days": "60"}', tools)
    assert calls["expiring"] == 60


def test_invalid_json_returns_error():
    _, tools = _tools()
    result = _execute_tool("get_pilot_detail", "{pilot_id: P001", tools)
    assert "error" in result


def test_non_object_json_returns_error():
    _, tools = _tools()
    result = _execute_tool("get_pilot_detail", '["P001"]', tools)
    assert "error" in result


def test_extra_argument_rejected():
    calls, tools = _tools()
    result = _execute_tool("get_pilot_detail", '{"pilot": "P001"}', tools)
    assert result["error"] == "Argumentos inválidos"
    assert "detail" not in calls


def test_wrong_type_rejected():
    calls, tools = _tools()
    result = _execute_tool("get_expiring_documents", '{"days": "trinta"}', tools)
    assert result["error"] == "Argumentos inválidos"
    assert result["details"][0]["campo"] == "days"
    assert "expiring" not in calls


def test_out_of_range_rejected():
    _, tools = _tools()
    result = _execute_tool("get_expiring_documents", '{"days": -5}', tools)
    assert result["error"] == "Argumentos inválidos"


def test_bad_pilot_id_format_rejected():
    _, tools = _tools()
    result = _execute_tool("get_pilot_detail", '{"pilot_id": "' + "x" * 5000 + '"}', tools)
    assert result["error"] == "Argumentos inválidos"


def test_args_for_no_arg_tool_rejected():
    _, tools = _tools()
    result = _execute_tool("get_pilots_summary", '{"foo": 1}', tools)
    assert result["error"] == "Argumentos inválidos"


def test_unknown_tool_returns_error():
    _, tools = _tools()
    result = _execute_tool("drop_database", "{}", tools)
    assert "error" in result


def test_tool_exception_is_contained_and_not_leaked():
    _, tools = _tools()
    result = _execute_tool("get_risk_scores", "{}", tools)
    assert "error" in result
    assert "segredo interno" not in str(result)
