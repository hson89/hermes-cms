import pytest
from pydantic import ValidationError
from src.application.mcp.a2ui import (
    A2UICard, A2UITable, A2UIChart, A2UIForm,
    map_alexandria_style
)

def test_a2ui_card_validation():
    # Arrange & Act
    card = A2UICard(
        title="Main Card",
        description="This is a test card",
        theme="primary",
        typography="serif",
        elevation="glass",
        children=[]
    )
    
    # Assert
    assert card.type == "card"
    assert card.title == "Main Card"
    assert card.theme == "primary"
    assert card.typography == "serif"
    assert card.elevation == "glass"

def test_a2ui_table_validation():
    # Arrange & Act
    table = A2UITable(
        theme="neutral",
        typography="sans",
        data={
            "headers": ["Metric", "Value"],
            "rows": [
                ["Title", "Alexandria Guide"],
                ["Word Count", "450 words"]
            ]
        }
    )
    
    # Assert
    assert table.type == "table"
    assert table.data.headers == ["Metric", "Value"]
    assert table.data.rows[0] == ["Title", "Alexandria Guide"]

def test_a2ui_chart_validation():
    # Arrange & Act
    chart = A2UIChart(
        chart_type="bar",
        labels=["Jan", "Feb"],
        datasets=[
            {"label": "Sales", "data": [10, 20]}
        ]
    )
    
    # Assert
    assert chart.type == "chart"
    assert chart.chart_type == "bar"
    assert chart.datasets[0].label == "Sales"
    assert chart.datasets[0].data == [10, 20]

def test_a2ui_form_validation():
    # Arrange & Act
    form = A2UIForm(
        fields=[
            {"name": "title", "label": "Title", "type": "text"}
        ],
        actions=[
            {"label": "Submit", "action": "draft_content", "payload": {"prompt": "test"}}
        ]
    )
    
    # Assert
    assert form.type == "form"
    assert form.fields[0].name == "title"
    assert form.actions[0].label == "Submit"

def test_map_alexandria_style():
    # Act & Assert
    assert map_alexandria_style("primary") == "#094cb2"
    assert map_alexandria_style("gold") == "#6d5e00"
    assert map_alexandria_style("success") == "success"
    assert map_alexandria_style("danger") == "danger"
    assert map_alexandria_style("neutral") == "neutral"
