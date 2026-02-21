import sys
import os
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

# Add backend to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from seed_plans import seed_plans
# from check_plans import check_plans
# from check_voices import check_indian_voices
from models import PlanLimits

def test_seed_plans_populates_database(db_session: Session):
    """
    Test that seed_plans.py correctly inserts default plans into the database.
    """
    # 1. Run seed_plans with the test session
    seed_plans(db=db_session)
    
    # 2. Verify data exists using direct query
    plans = db_session.query(PlanLimits).all()
    # Updated: There are 4 plans now (Free, Basic, Pro, Plus)
    assert len(plans) == 4
    
    plan_names = [p.plan_name for p in plans]
    assert "Free" in plan_names
    assert "Basic" in plan_names
    assert "Pro" in plan_names
    assert "Plus" in plan_names
    
    # Verify specific details
    basic_plan = db_session.query(PlanLimits).filter(PlanLimits.plan_name == "Basic").first()
    assert basic_plan.credit_limit == 3000
    assert basic_plan.history_days == 7

# def test_check_plans_reads_database(db_session: Session, capsys):
#     """
#     Test that check_plans.py correctly reads and prints plan data.
#     """
#     # 1. Seed data first
#     seed_plans(db=db_session)
#     
#     # 2. Run check_plans with test session
#     check_plans(db=db_session)
#     
#     # 3. Verify output
#     captured = capsys.readouterr()
#     assert "Plan: Basic, Credit Limit: 3000" in captured.out
#     assert "Plan: Pro, Credit Limit: 10000" in captured.out

# @patch("boto3.client")
# def test_check_voices_integration(mock_boto_client, capsys):
#     """
#     Test that check_voices.py runs without error and interacts with AWS client correctly.
#     """
#     # Setup mock response
#     mock_polly = MagicMock()
#     mock_boto_client.return_value = mock_polly
#     
#     # Mock response structure matching actual AWS response
#     mock_polly.describe_voices.return_value = {
#         'Voices': [
#             {
#                 'Name': 'Aditi',
#                 'Gender': 'Female',
#                 'SupportedEngines': ['standard', 'neural']
#             },
#             {
#                 'Name': 'Raveena',
#                 'Gender': 'Female',
#                 'SupportedEngines': ['standard']
#             }
#         ]
#     }
#     
#     # Run the function
#     check_indian_voices()
#     
#     # Verify mock was called
#     mock_boto_client.assert_called_with(
#         'polly',
#         aws_access_key_id='testing',  # From conftest.py env vars
#         aws_secret_access_key='testing',
#         region_name='us-east-1'
#     )
#     
#     # Verify output contains the mocked voices
    # captured = capsys.readouterr()
    # assert "Aditi (Female)" in captured.out
    # assert "Raveena (Female)" in captured.out
    # assert "Total Standard Voices: 2" in captured.out 
