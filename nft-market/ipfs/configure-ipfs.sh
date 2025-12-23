#!/bin/bash

# IPFS CORS 설정 스크립트
echo "IPFS CORS 설정을 시작합니다..."

# CORS 설정 - 웹 브라우저에서 IPFS API 접근 허용
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5001", "http://127.0.0.1:5001"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization"]'
ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers '["Location"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'

echo "CORS 설정이 완료되었습니다!"
echo ""
echo "IPFS 데몬을 실행하세요:"
echo "  ipfs daemon"
echo ""
echo "IPFS API 주소: http://localhost:5001"
echo "IPFS Gateway 주소: http://localhost:8080"
