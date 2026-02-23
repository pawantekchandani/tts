import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

def test_extract_pdf_success_valid_file(client: TestClient):
    """Test successful PDF text extraction with valid formatting."""
    # Mock the pdfplumber behavior
    with patch("main.pdfplumber.open") as mock_pdfplumber:
        mock_pdf = MagicMock()
        mock_page1 = MagicMock()
        # Simulate text with line breaks that should be removed, and paragraph breaks that should be kept
        mock_page1.extract_text.return_value = "Hello\nWorld.\n\nThis is a\nnew paragraph."
        
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page Two content."

        mock_pdf.pages = [mock_page1, mock_page2]
        
        # Proper context manager setup for mock
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        # Create dummy file content
        file_content = b"%PDF-1.4 dummy content"
        
        response = client.post(
            "/api/extract-pdf",
            files={"file": ("test.pdf", file_content, "application/pdf")}
        )

        assert response.status_code == 200
        data = response.json()
        assert "extracted_text" in data
        
        # Check if preprocessing is correct:
        # "Hello\nWorld.\n\nThis is a\nnew paragraph." -> "Hello World.\n\nThis is a new paragraph."
        # Because of string joining between pages, there should be another \n\n before "Page Two content."
        expected_text = "Hello World.\n\nThis is a new paragraph.\n\nPage Two content."
        assert data["extracted_text"] == expected_text

def test_extract_pdf_invalid_file_type(client: TestClient):
    """Test uploading a non-PDF file returns 400 Bad Request."""
    file_content = b"This is a text file."
    
    response = client.post(
        "/api/extract-pdf",
        files={"file": ("test.txt", file_content, "text/plain")}
    )

    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

def test_extract_pdf_plumber_error(client: TestClient):
    """Test handling of an error during PDF extraction (e.g. correlative file)."""
    with patch("main.pdfplumber.open") as mock_pdfplumber:
        mock_pdfplumber.side_effect = Exception("Corrupt PDF file")
        
        file_content = b"%PDF-1.4 corrupt content"
        
        response = client.post(
            "/api/extract-pdf",
            files={"file": ("corrupt.pdf", file_content, "application/pdf")}
        )

        assert response.status_code == 500
        assert "Failed to read PDF: Corrupt PDF file" in response.json()["detail"]
