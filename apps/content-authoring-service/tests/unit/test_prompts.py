import pytest
from unittest.mock import MagicMock
from src.domain.content_drafting.prompts import (
    get_drafting_prompt,
    get_refinement_prompt,
    DRAFTING_SYSTEM_PROMPT,
    DRAFTING_USER_PROMPT,
    REFINEMENT_SYSTEM_PROMPT,
    REFINEMENT_USER_PROMPT,
)

def test_get_drafting_prompt_fallback_on_none_client():
    prompt = get_drafting_prompt(None)
    messages = prompt.messages
    
    # Extract the template strings
    system_val = messages[0].prompt.template
    user_val = messages[2].prompt.template
    
    assert system_val == DRAFTING_SYSTEM_PROMPT
    assert user_val == DRAFTING_USER_PROMPT

def test_get_drafting_prompt_fallback_on_error():
    class CustomLangfuseClient:
        def __init__(self, raise_error=False):
            self.raise_error = raise_error
            self.get_prompt_calls = []

        def get_prompt(self, name, label):
            self.get_prompt_calls.append((name, label))
            if self.raise_error:
                raise Exception("Network failure")
            
            mock_prompt = MagicMock()
            mock_prompt.version = 42
            mock_prompt.get_langchain_prompt.return_value = f"Custom remote {name}"
            return mock_prompt

    client = CustomLangfuseClient(raise_error=True)
    prompt = get_drafting_prompt(client)
    
    # Since it failed, it should fall back to default prompts
    messages = prompt.messages
    system_val = messages[0].prompt.template
    user_val = messages[2].prompt.template
    
    assert system_val == DRAFTING_SYSTEM_PROMPT
    assert user_val == DRAFTING_USER_PROMPT
    assert len(client.get_prompt_calls) == 2

def test_get_drafting_prompt_success():
    class CustomPrompt:
        def __init__(self, name):
            self.version = 42
            self.name = name
            
        def get_langchain_prompt(self):
            return f"Custom remote {self.name}"

    class CustomLangfuseClient:
        def get_prompt(self, name, label):
            return CustomPrompt(name)

    client = CustomLangfuseClient()
    prompt = get_drafting_prompt(client)
    
    messages = prompt.messages
    system_val = messages[0].prompt.template
    user_val = messages[2].prompt.template
    
    assert system_val == "Custom remote content-drafting-system"
    assert user_val == "Custom remote content-drafting-user"
    
    assert prompt.config["metadata"]["langfuse_system_prompt_version"] == 42
    assert prompt.config["metadata"]["langfuse_user_prompt_version"] == 42

def test_get_refinement_prompt_success():
    class CustomPrompt:
        def __init__(self, name):
            self.version = 24
            self.name = name
            
        def get_langchain_prompt(self):
            return f"Custom remote {self.name}"

    class CustomLangfuseClient:
        def get_prompt(self, name, label):
            return CustomPrompt(name)

    client = CustomLangfuseClient()
    prompt = get_refinement_prompt(client)
    
    messages = prompt.messages
    system_val = messages[0].prompt.template
    user_val = messages[2].prompt.template
    
    assert system_val == "Custom remote content-refinement-system"
    assert user_val == "Custom remote content-refinement-user"
    
    assert prompt.config["metadata"]["langfuse_system_prompt_version"] == 24
    assert prompt.config["metadata"]["langfuse_user_prompt_version"] == 24
