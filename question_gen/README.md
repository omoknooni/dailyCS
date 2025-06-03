# DailyCS CS-Question Generation
CS 스킬 관련 4지선다 객관식 타입의 문제를 생성하는 파트  
해당 파트에서는 `gemini-2.5-flash-preview-05-20`를 사용해서 생성함  
## Logic
- 미리 지정된 CS 주제(알고리즘, 네트워크, OS, Git, DevOps 등)와 하위 주제를 바탕으로 prompt를 제시해서 문제를 제작  
- 제작된 문제는 우선 S3버킷에 저장  
- 생성 script의 동작은 주기적으로 (kubernetes-CronJob or AWS-Lambda/EventBridge .etc)
## TODO
- 생성된 문제 간의 유사도 체크 (with RAG, .etc)
- 문제의 다양성 (주제, 하위 주제)