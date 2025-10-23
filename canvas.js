import config from "./apikey.js";

const endpoint = "https://api.openai.com/v1/chat/completions";
const dalleEndpoint = "https://api.openai.com/v1/images/generations";
const apiKey = config.API_KEY1; // 🔹 OpenAI API 키 입력

let cleanedText = "";
let isLoading = false;
let pdfDoc = null;
let extractedPaperTitle = ""; // 추출된 논문 제목을 저장할 변수

// =========================================================PDF.js 초기화 및 PDF 업로드 처리
// 기존 DOMContentLoaded 이벤트 리스너 부분을 다음으로 교체
document.addEventListener('DOMContentLoaded', () => {
    // PDF.js 라이브러리 초기화
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // 파일 업로드 이벤트 리스너 추가
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // 페이지 로드 시 .addNote 요소를 숨김
    $(".libraryInner").hide();
    $(".addNote").hide();
    $(".paper").hide();
    $(".answer").hide();
    $(".save_folder").hide();
    $(".userProject").hide();
    $(".projectIdea").hide();

    const saveFolder = document.querySelector('.addNote');
    saveFolder.addEventListener('click', () => {
        // 배경 먼저 페이드인
        $(".save_folder").fadeIn(200, function() {
            // .pop은 살짝 위에 있다가
            $(".save_folder .pop")
                .css({
                    opacity: 0,
                    transform: "translateY(-20px)"
                })
                .animate(
                    { opacity: 1 },
                    {
                        duration: 300,
                        step: function(now, fx) {
                            if (fx.prop === "opacity") {
                                const translateY = -20 + (now * 20);
                                $(this).css("transform", "translateY(" + translateY + "px)");
                            }
                        }
                    }
                );
        });
    });
    
    const closeFolder = document.querySelector('.folder_close');
    closeFolder.addEventListener('click', () => {
        // .pop은 올라가는 모션 없이 opacity만 줄임
        $(".save_folder .pop").animate(
            { opacity: 0 },
            {
                duration: 100,
                complete: function() {
                    // transform은 다시 초기 위치로 되돌림
                    $(this).css("transform", "translateY(-20px)");
                    // 배경 페이드아웃
                    $(".save_folder").fadeOut(200);
                }
            }
        );
    });

    
    // 초기 상태 설정
    document.getElementById("paper-content").innerHTML = '<div class="upload-message">PDF 파일을 업로드해주세요.</div>';

    // insightSave 버튼 이벤트 리스너 추가
    // 기존 insightSave 버튼 이벤트 리스너 수정
    // 기존 insightSave 버튼 이벤트 리스너를 다음과 같이 수정
    const insightSaveBtn = document.querySelector(".insightSave");
    if (insightSaveBtn) {
        insightSaveBtn.addEventListener("click", function() {
            console.log("insightSave 버튼이 클릭되었습니다.");
            
            const currentType = getActiveButtonType();
            console.log("현재 활성 타입:", currentType);
            
            let target;
            
            // 아이디어 생성 도우미인 경우 .projectIdea 요소를 타겟으로 설정
            if (currentType === "아이디어 생성 도우미") {
                target = document.querySelector(".projectIdea");
                console.log("아이디어 생성 도우미 - .projectIdea 요소 선택");
            } else {
                target = document.querySelector(".answerInner");
                console.log("기타 인사이트 - .answerInner 요소 선택");
            }
            
            if (!target) {
                console.error("저장할 요소를 찾을 수 없습니다.");
                alert("저장할 콘텐츠를 찾을 수 없습니다.");
                return;
            }
            
            // 콘텐츠가 비어있는지 확인
            if (!target.innerHTML.trim() || target.innerHTML.trim() === '') {
                console.error("저장할 콘텐츠가 비어있습니다.");
                alert("저장할 콘텐츠가 없습니다. 먼저 인사이트를 생성해주세요.");
                return;
            }
            
            // 로딩 중인지 확인 (loader 스핀이 있으면 아직 로딩 중)
            if (target.querySelector('.loader')) {
                alert("콘텐츠를 생성하는 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }
            
            // html2canvas가 로드되었는지 확인
            if (typeof html2canvas === 'undefined') {
                console.error("html2canvas 라이브러리가 로드되지 않았습니다.");
                alert("이미지 변환 라이브러리를 로드할 수 없습니다.");
                return;
            }
            
            console.log("html2canvas 시작...");
            console.log("캡처 대상:", target);
            
            // 이미지들이 모두 로드될 때까지 대기
            const images = target.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                return new Promise((resolve) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.onload = resolve;
                        img.onerror = resolve;
                    }
                });
            });
            
            Promise.all(imagePromises).then(() => {
                // 아이디어 생성 도우미의 경우 다른 설정 적용
                const canvasOptions = {
                    backgroundColor: '#ffffff',
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    foreignObjectRendering: false,
                    imageTimeout: 15000,
                    logging: false,
                    height: target.scrollHeight,
                    width: target.scrollWidth
                };

                // 아이디어 생성 도우미의 경우 여백 조정
                if (currentType === "아이디어 생성 도우미") {
                    canvasOptions.scrollX = 0;
                    canvasOptions.scrollY = 0;
                    // 필요시 추가 스타일링
                    target.style.padding = "20px";
                    target.style.backgroundColor = "#ffffff";
                }

                html2canvas(target, canvasOptions).then(canvas => {
                    console.log("html2canvas 완료");
                    
                    const imgData = canvas.toDataURL("image/jpeg", 0.8);
                    console.log("이미지 데이터 생성 완료");
                    console.log("저장될 타입:", currentType);
                    
                    // 이미지 크기가 너무 큰 경우 추가 압축
                    let finalImgData = imgData;
                    if (imgData.length > 800000) {
                        finalImgData = canvas.toDataURL("image/jpeg", 0.6);
                        console.log("재압축된 이미지 크기:", finalImgData.length, "bytes");
                    }
                    
                    // insightImage 요소에 표시
                    const insightImageElement = document.getElementById('insightImage');
                    if (insightImageElement) {
                        insightImageElement.src = finalImgData;
                        insightImageElement.style.display = 'block';
                        console.log("✅ 캡처된 이미지가 표시되었습니다.");
                    }
                    
                    // 스타일링 복원 (아이디어 생성 도우미의 경우)
                    if (currentType === "아이디어 생성 도우미") {
                        target.style.padding = "";
                        target.style.backgroundColor = "";
                    }
                    
                    // Firebase에 저장
                    if (finalImgData.length > 1000000) {
                        saveToLocalStorage(finalImgData, currentType);
                        
                        const link = document.createElement('a');
                        link.download = 'insight_' + new Date().getTime() + '.jpg';
                        link.href = finalImgData;
                        link.click();
                        
                        alert("이미지 크기가 커서 로컬에 저장되었습니다.");
                    } else {
                        saveToFirestoreBase64(finalImgData, currentType);
                    }
                    
                }).catch(error => {
                    console.error("❌ html2canvas 오류:", error);
                    alert("이미지 저장 중 오류가 발생했습니다: " + error.message);
                    
                    // 오류 발생 시 스타일링 복원
                    if (currentType === "아이디어 생성 도우미") {
                        target.style.padding = "";
                        target.style.backgroundColor = "";
                    }
                });
            });
        });
    } else {
        console.error(".insightSave 버튼을 찾을 수 없습니다.");
    }
    

});


// 저장된 인사이트 확인 함수 (디버깅용)
function showSavedInsights() {
    const savedInsights = JSON.parse(localStorage.getItem('savedInsights') || '[]');
    console.log("저장된 인사이트들:", savedInsights);
    savedInsights.forEach((insight, index) => {
        console.log(`${index + 1}. Type: ${insight.type}, Time: ${insight.timestamp}, Size: ${insight.image.length} bytes`);
    });
    return savedInsights;
}

// 저장된 인사이트 삭제 함수
function clearSavedInsights() {
    localStorage.removeItem('savedInsights');
    console.log("저장된 인사이트들이 삭제되었습니다.");
}

// 현재 활성화된 버튼 타입 가져오기
function getActiveButtonType() {
    const activeButton = document.querySelector('.action-btn.active');
    if (activeButton) {
        const buttonText = activeButton.textContent.trim();
        
        // 버튼 텍스트에 따른 정확한 타입명 매핑
        const buttonToTypeMap = {
            "요약정리": "디자인 브리프",
            "퍼소나": "퍼소나 스토리", 
            "가이드라인": "디자인 가이드라인",
            "자료추천": "관련 자료 추천",
            "아이디어": "아이디어 생성 도우미"
        };
        
        return buttonToTypeMap[buttonText] || buttonText;
    }
    return '퍼소나 스토리'; // 기본값
}

// 로컬 스토리지에 저장하는 함수
function saveToLocalStorage(imageDataUrl, type = "persona") {
    try {
        const timestamp = Date.now();
        const saveData = {
            image: imageDataUrl,
            type: type,
            title: extractedPaperTitle || "제목 없음",
            timestamp: new Date().toISOString(),
            id: timestamp
        };
        
        let savedInsights = JSON.parse(localStorage.getItem('savedInsights') || '[]');
        savedInsights.push(saveData);
        localStorage.setItem('savedInsights', JSON.stringify(savedInsights));
        
        console.log("✅ 로컬 스토리지에 저장 완료:", timestamp);
        
    } catch (error) {
        console.error("❌ 로컬 스토리지 저장 실패:", error);
    }
}

// ========================================================파이어베이스에 업로드
// Firebase에 base64 이미지 저장 함수
function saveToFirestoreBase64(imageDataUrl, type = "퍼소나 스토리") {
    const db = firebase.firestore();
    const timestamp = Date.now();
    
    // 이미지 크기 재확인
    if (imageDataUrl.length > 1000000) {
        console.error("❌ 이미지 크기가 Firestore 제한을 초과합니다:", imageDataUrl.length, "bytes");
        alert("이미지 크기가 너무 큽니다. 로컬 저장만 진행됩니다.");
        saveToLocalStorage(imageDataUrl, type);
        return;
    }
    
    // 로딩 상태 표시
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = '저장 중...';
    loadingAlert.style.cssText = `
        width: 144px;
        height: 50px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 16px 40px;
        border-radius: 6px;
        z-index: 9999;
        box-shadow: 0px 0px 20px 0px rgb(0, 0, 0, 0.2);
    `;
    document.body.appendChild(loadingAlert);

    // 타입을 매핑된 값으로 저장
    const mappedType = typeMapping[type] || type;
    
    const documentData = {
        type: type, // 매핑된 타입 저장
        displayType: type, // 화면 표시용 타입도 함께 저장
        title: extractedPaperTitle || "제목 없음",
        timestamp: new Date().toISOString(),
        imageSize: imageDataUrl.length,
        imageData: imageDataUrl.substring(0, 900000),
        isCompressed: true
    };
    
    console.log("💾 Firebase 저장 데이터:", documentData);
    
    db.collection("post").doc(String(timestamp)).set(documentData)
    .then(() => {
        console.log("✅ Firestore 저장 성공:", timestamp);
        
        // 로컬에도 백업 저장
        saveToLocalStorage(imageDataUrl, type);
        
        // 🔥 수정: "저장 완료!"로 변경
        loadingAlert.innerHTML = '저장 완료!';
        
        // 🔥 수정: 2초 후에 로딩 팝업 제거하고 저장 팝업 닫기
        setTimeout(() => {
            // 로딩 팝업 제거
            if (loadingAlert.parentNode) {
                document.body.removeChild(loadingAlert);
            }
            
            // 저장 팝업 닫기
            $(".save_folder .pop").animate(
                { opacity: 0 },
                {
                    duration: 100,
                    complete: function() {
                        $(this).css("transform", "translateY(-20px)");
                        $(".save_folder").fadeOut(100);
                    }
                }
            );
        }, 2000);
    })
    .catch((error) => {
        console.error("❌ Firestore 저장 실패:", error);
        
        // 🔥 수정: 에러 시에만 로딩 팝업 즉시 제거
        if (loadingAlert.parentNode) {
            document.body.removeChild(loadingAlert);
        }
        
        // Firebase 저장 실패 시 로컬 저장으로 대체
        console.log("로컬 저장으로 대체합니다.");
        saveToLocalStorage(imageDataUrl, type);
        
        alert("클라우드 저장 실패. 로컬에 저장되었습니다.");
    });
}


// =========================================================PDF 파일 업로드 및 처리
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    if (file.type !== 'application/pdf') {
        alert('PDF 파일만 업로드 가능합니다.');
        return;
    }
    
    console.log("PDF 파일 업로드됨:", file.name);
    
    // 로딩 표시
    document.getElementById("paper-content").innerHTML = '<span class="loader"></span>';
    isLoading = true;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        await loadPDF(arrayBuffer);
    } catch (error) {
        console.error("PDF 로드 오류:", error);
        document.getElementById("paper-content").innerHTML = '<div class="error">PDF 로드 중 오류가 발생했습니다: ' + error.message + '</div>';
        isLoading = false;
    }
}

// =========================================================PDF 로드 및 텍스트 추출
async function loadPDF(arrayBuffer) {
    try {
        $(".mainInner").hide();
        $(".libraryInner").show();
        $(".paper").show();
        $(".answer").show();

        // PDF 문서 로드
        const loadingTask = window.pdfjsLib.getDocument({data: arrayBuffer});
        pdfDoc = await loadingTask.promise;
        
        console.log("PDF 로드 완료. 총 페이지 수:", pdfDoc.numPages);
        
        // 모든 페이지의 텍스트 추출
        let fullText = "";
        let allTextItems = [];
        
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // 텍스트 아이템들을 배열에 저장
            textContent.items.forEach(item => {
                if (item.str.trim()) {
                    allTextItems.push(item.str);
                }
            });
        }
        
        // 논문 제목 추출 (Promise 기반으로 변경)
        try {
            extractedPaperTitle = await extractPaperTitleWithGPT(allTextItems);
            console.log("추출된 논문 제목:", extractedPaperTitle);
            
            // 화면에 제목 표시
            updatePaperTitleDisplay(extractedPaperTitle);
        } catch (titleError) {
            console.error("제목 추출 중 오류:", titleError);
            extractedPaperTitle = "논문 제목";
            updatePaperTitleDisplay(extractedPaperTitle);
        }
        
        // 텍스트를 문단 단위로 그룹화
        let paragraphs = [];
        let currentParagraph = "";
        
        for (let i = 0; i < allTextItems.length; i++) {
            const text = allTextItems[i].trim();
            currentParagraph += text + " ";
            
            // 문장이 끝나거나 특정 길이에 도달하면 문단 나누기
            if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?') || 
                currentParagraph.length > 500) {
                
                // 다음 텍스트가 대문자로 시작하거나 새로운 섹션인 경우 문단 구분
                if (i < allTextItems.length - 1) {
                    const nextText = allTextItems[i + 1].trim();
                    if (nextText.charAt(0) === nextText.charAt(0).toUpperCase() && 
                        (currentParagraph.length > 200 || text.endsWith('.'))) {
                        paragraphs.push(currentParagraph.trim());
                        currentParagraph = "";
                    }
                } else {
                    paragraphs.push(currentParagraph.trim());
                    currentParagraph = "";
                }
            }
        }
        
        // 마지막 문단 추가
        if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
        }
        
        // 전체 텍스트도 생성
        fullText = paragraphs.join("\n\n");
        
        // 추출된 텍스트 저장
        cleanedText = fullText.replace(/\s+/g, " ").trim();

        // PDF이미지 추출
        let htmlContent = "";

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);

            // Canvas 생성
            const viewport = page.getViewport({ scale: 6 }); // 확대 비율 조절
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // 캔버스를 Base64 이미지로 변환
            const imageDataUrl = canvas.toDataURL("image/png");

            // 이미지를 HTML에 추가
            htmlContent += `
                <div class="pdf-page-image">
                    <img src="${imageDataUrl}" alt="PDF Page ${pageNum}" />
                </div>
            `;
        }

        // HTML에 표시
        document.getElementById("paper-content").innerHTML = `
            <div class="pdf-content-container">
                ${htmlContent}
            </div>
        `;

        console.log("✅ PDF 페이지 이미지 렌더링 완료");
        console.log("✅ PDF 텍스트 추출 완료. 총 문자 수:", cleanedText.length);
        isLoading = false;
        
    } catch (error) {
        console.error("❌ PDF 처리 오류:", error);
        document.getElementById("paper-content").innerHTML = '<div class="error">PDF 처리 중 오류가 발생했습니다: ' + error.message + '</div>';
        extractedPaperTitle = "논문 제목"; // 오류 시 기본값 설정
        isLoading = false;
    }
}

//-------------------------------------------------------- 논문 제목 추출 함수
function extractPaperTitleWithGPT(textItems) {
    return new Promise((resolve) => {
        if (!textItems || textItems.length === 0) {
            console.warn("텍스트가 없어 기본 제목을 사용합니다.");
            resolve("논문 제목");
            return;
        }
        
        // 첫 페이지의 텍스트만 사용 (너무 많은 텍스트는 API 제한에 걸릴 수 있음)
        const firstPageText = textItems.slice(0, 150).join(" ").substring(0, 3000);
        
        // 간단한 규칙 기반 제목 추출 시도
        const simpleTitle = extractTitleByRules(textItems);
        if (simpleTitle && simpleTitle !== "논문 제목") {
            console.log("규칙 기반으로 제목 추출:", simpleTitle);
            resolve(simpleTitle);
            return;
        }
        
        // API 키가 없는 경우 규칙 기반 결과 반환
        if (!apiKey || apiKey.trim() === '') {
            console.warn("API 키가 없어 규칙 기반 제목을 사용합니다.");
            resolve(simpleTitle || "논문 제목");
            return;
        }
        
        const titleExtractionPrompt = `다음은 PDF 논문의 첫 페이지에서 추출한 텍스트입니다. 이 텍스트에서 논문의 제목만을 정확히 추출해서 알려주세요.

텍스트:
${firstPageText}

요구사항:
1. 논문의 메인 제목만 추출해주세요 (부제목 포함 가능)
2. 저자명, 소속기관, 초록, 키워드 등은 제외해주세요
3. 한국어 제목과 영어 제목이 모두 있다면 한국어 제목을 우선해주세요
4. 제목이 명확하지 않으면 가장 논문 제목 같은 텍스트를 선택해주세요
5. 제목만 답변해주세요 (다른 설명이나 따옴표 없이)
6. 만약 제목을 찾을 수 없다면 "제목 없음"이라고 답변해주세요`;

        callGPT(titleExtractionPrompt, function(error, response) {
            if (error) {
                console.error("GPT 제목 추출 오류:", error);
                resolve(simpleTitle || "논문 제목");
                return;
            }
            
            // GPT 응답에서 제목만 정리
            let title = response.trim();
            
            // 불필요한 문자나 패턴 제거
            title = title.replace(/^["']|["']$/g, ''); // 따옴표 제거
            title = title.replace(/^제목:\s*/, ''); // "제목:" 제거
            title = title.replace(/^논문제목:\s*/, ''); // "논문제목:" 제거
            title = title.replace(/^Title:\s*/i, ''); // "Title:" 제거
            title = title.replace(/^\d+\.\s*/, ''); // 번호 제거
            
            // 너무 긴 경우 자르기
            if (title.length > 100) {
                title = title.substring(0, 100) + "...";
            }
            
            // 너무 짧거나 의미없는 제목인 경우 규칙 기반 결과 사용
            if (title.length < 5 || title === "제목 없음" || title.includes("찾을 수 없")) {
                console.log("GPT 결과가 부적절하여 규칙 기반 제목 사용:", simpleTitle);
                resolve(simpleTitle || "논문 제목");
                return;
            }
            
            console.log("GPT로 추출된 제목:", title);
            resolve(title);
        });
    });
}

// 규칙 기반 제목 추출 함수 (새로 추가)
function extractTitleByRules(textItems) {
    if (!textItems || textItems.length === 0) return "논문 제목";
    
    // 첫 20개 텍스트 항목에서 제목 후보 찾기
    const candidates = textItems.slice(0, 20);
    
    // 제목 후보들을 점수로 평가
    let bestCandidate = "";
    let bestScore = 0;
    
    for (let i = 0; i < candidates.length; i++) {
        const text = candidates[i].trim();
        
        // 너무 짧거나 긴 텍스트 제외
        if (text.length < 10 || text.length > 100) continue;
        
        let score = 0;
        
        // 한글이 포함된 경우 가점
        if (/[가-힣]/.test(text)) score += 10;
        
        // 영어 대문자로 시작하는 경우 가점
        if (/^[A-Z]/.test(text)) score += 5;
        
        // 숫자로만 이루어져 있으면 감점
        if (/^\d+$/.test(text)) score -= 10;
        
        // 이메일이나 URL이 포함되면 감점
        if (text.includes('@') || text.includes('http')) score -= 10;
        
        // 저자명 패턴이면 감점 (예: "김철수, 이영희")
        if (text.includes(',') && text.split(',').length > 2) score -= 5;
        
        // Abstract, Introduction 등 논문 섹션명이면 감점
        if (/^(abstract|introduction|conclusion|references|키워드|초록)/i.test(text)) {
            score -= 10;
        }
        
        // 적절한 길이 (20-100자)면 가점
        if (text.length >= 20 && text.length <= 100) score += 5;
        
        // 첫 번째나 두 번째 텍스트면 가점 (제목이 보통 맨 위에 있음)
        if (i <= 1) score += 3;
        
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = text;
        }
    }

    if (bestCandidate.length > 100) {
        bestCandidate = bestCandidate.substring(0, 100).trim() + "...";
    }
    
    return bestCandidate || "논문 제목";
}


// 화면에 논문 제목 표시하는 함수
function updatePaperTitleDisplay(title) {
    const paperTitleElement = document.querySelector('.paper-title');
    if (paperTitleElement) {
        paperTitleElement.textContent = title;
        console.log("✅ 논문 제목이 화면에 표시되었습니다:", title);
    } else {
        console.warn("⚠️ .paper-title 요소를 찾을 수 없습니다.");
    }
}

// 인사이트 타입을 화면에 표시하는 함수
function updateInsightTypeDisplay(type) {
    const insightTitleElement = document.querySelector('.insight-title');
    if (insightTitleElement) {
        insightTitleElement.textContent = type;
        console.log("✅ 인사이트 타입이 화면에 표시되었습니다:", type);
    } else {
        console.warn("⚠️ .insight-title 요소를 찾을 수 없습니다.");
    }
}

// 저장된 데이터에서 제목과 타입을 불러와 표시하는 함수
function loadAndDisplayTitleFromFirestore() {
    const db = firebase.firestore();
    db.collection("post").orderBy("timestamp", "desc").limit(1).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.title) {
                    updatePaperTitleDisplay(data.title);
                }
                if (data.type) {
                    updateInsightTypeDisplay(data.type);
                }
                if (data.imageData) {
                    const imgElement = document.getElementById("insightImage");
                    if (imgElement) {
                        imgElement.src = data.imageData;
                        imgElement.style.display = "block";
                    }
                }
                console.log("✅ 최신 데이터 로드 완료");
            });
        })
        .catch((error) => {
            console.error("❌ Firestore 데이터 로드 실패:", error);
        });
}



// =========================================================question 버튼튼

document.addEventListener('DOMContentLoaded', () => {
    const question = document.querySelector('.question');
    const questionOut = document.querySelector('.question-container');
    const leftBtn = document.querySelector('.quest-left');
    const rightBtn = document.querySelector('.quest-right');

    console.log("question:", question); // 확인용
    console.log("leftBtn:", leftBtn);
    console.log("rightBtn:", rightBtn);

    // 페이지 로드 시 최신 데이터 불러오기
    loadAndDisplayTitleFromFirestore();

    function getLeftValue() {
        return parseInt(window.getComputedStyle(question).left, 10);
    }

    questionOut.addEventListener('mouseenter', () => {
        const left = getLeftValue();
        console.log("현재 left:", left);

        if (left > 20) {
            rightBtn.style.display = 'block';
            leftBtn.style.display = 'none';
        } else {
            leftBtn.style.display = 'block';
            rightBtn.style.display = 'none';
        }
    });

    questionOut.addEventListener('mouseleave', () => {
        rightBtn.style.display = 'none';
        leftBtn.style.display = 'none';
    });

    rightBtn.addEventListener('click', () => {
        question.style.left = '-202px';
        rightBtn.style.display = 'none';
        console.log("오른쪽 이동");
    });

    leftBtn.addEventListener('click', () => {
        question.style.left = '24px';
        leftBtn.style.display = 'none';
        console.log("왼쪽 이동");
    });
});

    
// 버튼 선택 함수 (기존 selectButton 함수를 이것으로 교체)
function selectButton(button) {
    // 모든 버튼에서 active 클래스 제거
    const allButtons = document.querySelectorAll('.action-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // 클릭된 버튼에 active 클래스 추가
    button.classList.add('active');
}

// =========================================================GPT API 호출
function callGPT(prompt, callback) {
    // API 키 검증
    if (!apiKey || apiKey.trim() === '') {
        callback(new Error("API 키가 설정되지 않았습니다. 코드에 API 키를 입력해주세요."), null);
        return;
    }
    
    // 로딩 표시
    // $(".answerInner").html('<span class="loader"></span>');
    
    // 실제 API 호출 코드
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "너는 디자인 관련 논문을 디자인 특화된 정보로 재구성해서 제공해주는 AI야. 요청에 따라 논문의 내용을 바탕으로 디자인 브리프 중심의 요약정리, 가상의 퍼소나&스토리보드, 디자인 가이드라인, 관련 자료(뉴스기사, 논문 등), 유저의 프로젝트에 도움이 될 아이디어 등을 생성해야 해."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2048
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                console.error("API 오류 응답:", errorData);
                throw new Error(`API 오류 (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
            }).catch(e => {
                throw new Error(`API 오류 (${response.status})`);
            });
        }
        return response.json();
    })
    .then(data => {
        try {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const responseText = data.choices[0].message.content.trim();
                callback(null, responseText);
            } else {
                throw new Error("API 응답 형식이 예상과 다릅니다: " + JSON.stringify(data));
            }
        } catch (error) {
            console.error("JSON 파싱 오류:", error);
            callback(error, null);
        }
    })
    .catch(error => {
        console.error("GPT 호출 오류:", error);
        callback(error, null);
    });
}

// =========================================================DALL-E
function callDalle(prompt, callback, size = "1024x1024") {
    fetch(dalleEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",  // DALL-E 3 모델 지정
        prompt: prompt,
        n: 1,  // DALL-E 3은 n=1만 지원합니다.
        size: size,  // DALL-E 3의 기본 이미지 크기
        quality: "standard",  // 품질 옵션: "standard" 또는 "hd"
        style: "vivid",  // 스타일 옵션: "vivid" 또는 "natural"
        response_format: "b64_json"// 응답 형식: base64 인코딩된 JSON
      })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
  
      //무시해도 되는 부분 데이터 파싱 및 오류 해결 위한 코드임
    .then(data => {
        if (data && data.data && data.data.length > 0) {
            let base64 = data.data[0].b64_json;   // ✅ base64 꺼내기
            if (base64) {
                let dataUrl = `data:image/png;base64,${base64}`;  // ✅ Data URL 생성
                callback(dataUrl);
            } else {
                console.error('Base64 데이터를 찾을 수 없습니다.');
                callback(null);
            }
        } else {
            console.error('이미지 데이터를 찾을 수 없습니다.');
            callback(null);
        }
    })
    .catch(error => {
      console.error("DALL-E API 오류:", error);
      callback(null);
    });
  }
  

    // 예시 사용
    const imagePrompt = "";

  callDalle(imagePrompt, function(imageUrl) {
    console.log("Generated Image URL:", imageUrl);
    // 이미지 URL 사용
  });


// =========================================================퍼소나 클릭
// =========================================================퍼소나 클릭
// =========================================================퍼소나 클릭
function onPersonaClick(){
    // 인사이트 타입 표시
    updateInsightTypeDisplay("퍼소나 스토리");

    // 로딩 표시
    $(".answerInner").html('<span class="loader"></span>');

    $(".addNote").hide();
    $(".userProject").hide();
    $(".projectIdea").hide();


    // 로딩 중이거나 텍스트가 비어있는 경우 처리
    if (isLoading) {
        alert("논문을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }
    
    if (!cleanedText || cleanedText.trim() === '') {
        alert("논문 내용을 먼저 불러와 주세요.");
        return;
    }

    const maxLength = 4000;
    const truncatedText = cleanedText.length > maxLength 
        ? cleanedText.substring(0, maxLength) + "... (텍스트가 너무 길어 잘렸습니다)"
        : cleanedText;


    const locations = ["서울", "부산", "인천", "대구", "대전", "광주", "울산", "세종", 
        "강원", "경기", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
    
    // 랜덤으로 위치 선택
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    const personaPrompt = `다음 논문 내용${truncatedText}을 보고 가상의 퍼소나를 JSON 형식으로 제공해줘:
                            {
                                "name": "",
                                "age": "",
                                "occupation": "",
                                "gender": "",
                                "place": "",
                                "characteristics": "",
                                "summary": "",
                                "scenario": [
                                    {
                                        "title": "퍼소나 스토리보드 제목1",
                                        "content": "퍼소나 스토리보드 내용1"
                                    },
                                    {
                                        "title": "퍼소나 스토리보드 제목2",
                                        "content": "퍼소나 스토리보드 내용2"
                                    },
                                    {
                                        "title": "퍼소나 스토리보드 제목3",
                                        "content": "퍼소나 스토리보드 내용3"
                                    }
                                ]
                            }

                            For the name, please generate a random Korean name with three characters including the last name and given name, for the location, please create it with ${randomLocation}, and for the summary, please write it in Korean characters that accurately describes the persona's needs. 
                            Write in natural language, such as "...하고 싶어요" or "...을 원해요". And I hope it's not a normal, commonly wanted need. Please keep your persona's needs at least 10 characters and a maximum of 30 characters.
                            Please write your age in numbers only.
                            For characteristics, please write two words that describe the persona's character traits and personality, and for gender, please write 여성(female) or 남성(male).
                            For title, use content and write a short title for the persona's actions or situation.

                            Scenario is a persona or storyboard. Persona performs three levels of action with one purpose, and the process is divided into three levels. So I hope the three storyboards that I divided will consist of continuous contents.
                            It must be connected to the content of the three storyboards.
                            Please describe and explain each situation as naturally as possible in accordance with the six principles. Please make sure that the number of characters is at least 200.
                            content는 200자~300자로 작성해주세요.
                            Create a scenario of at least 200 characters detailing the situation and background of the persona based on the user's characteristics and problems defined in ${truncatedText}. 
                            It describes situations and persona's thoughts in detail by when, where, who, what, why, and how. Write this description in a conversion into a natural sentence
                            Occupation is the persona's occupation and must be no more than 10 characters. Please write everything in Korean. And please write the summary and gender in Korean as well.
                        `;

    callGPT(personaPrompt, function (error, personaData) {
        if (error) {
            console.error("🚨 퍼소나 추출 실패:", error);
            $(".answerInner").html("<p>퍼소나 생성 중 오류가 발생했습니다.</p>");
            return;
        }

        // 🔹 JSON 데이터 파싱
        let personaJSON = {};
        try {
            // JSON 부분만 추출하는 정규식
            const jsonRegex = /{[\s\S]*}/;
            const match = personaData.match(jsonRegex);
            
            if (match) {
                personaJSON = JSON.parse(match[0]);
            } else {
                throw new Error("응답에서 JSON 형식을 찾을 수 없습니다.");
            }
        } catch (jsonError) {
            console.error("🚨 JSON 변환 오류:", jsonError);
            $(".answerInner").html(`
                <div class="error-message">
                    <h3>데이터 형식 오류</h3>
                    <p>퍼소나를 구조화하는데 문제가 발생했습니다. 원본 응답을 표시합니다:</p>
                    <pre>${personaData}</pre>
                </div>
            `);
            return;
        }


        
        // API 키가 없는 경우 대체 이미지 사용
        if (!apiKey || apiKey.trim() === '') {
            renderPersonaWithPlaceholder(personaJSON, randomLocation);
            return;
        }

        // DALL-E API 호출 - 퍼소나 프로필 이미지
        const prompt = `Create a korea person. The person is a ${personaJSON.gender} aged ${personaJSON.age}. 
                    Please unify all the pictures in a webtoon style.
                    Facial expressionless or slightly smiling. Dress a white or black shirt or suit with clothes that match one's age and gender. Never wear a hanbok or traditional costume.
                    a Korean woman wearing modern casual clothes. a Korean man in a business suit.
                    The background is one color without any objects, sky blue. Look straight ahead, and let it come out like you're taking a profile picture. 
                    Make sure there's only one person and don't put any unnecessary objects or letters in it.
                    한복이나 전통의상을 절대 입히지마세요. Only one person has to come out.`;
                            
        callDalle(prompt, function(imageUrl) {
            if (imageUrl) {
                renderPersonaWithImage(personaJSON, randomLocation, imageUrl);
            } else {
                renderPersonaWithPlaceholder(personaJSON, randomLocation);
            }
        }, "1024x1024");
    });

    // 퍼소나 버튼을 활성화 상태로 설정
    const personaButton = document.querySelector('.action-btn[onclick*="onPersonaClick"]');
    if (personaButton) {
        selectButton(personaButton);
    }
}

// 2. 이미지를 Blob으로 변환하여 CORS 문제 해결
function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// 3. 이미지 사용 시 Blob URL 생성
function renderPersonaWithImage(persona, location, imageDataUrl) {
    // Data URL을 Blob으로 변환
    const blob = dataURLToBlob(imageDataUrl);
    const blobUrl = URL.createObjectURL(blob);
    
    renderPersonaProfile(persona, location, blobUrl);
    
    // 스토리보드 컨테이너 생성
    $(".answerInner").append(`
        <div class="storyboard">
            <h1>퍼소나 스토리 보드</h1>
            <div class="scenario-loading">스토리보드 이미지를 생성하는 중입니다...</div>
            <div class="scenario"></div>
        </div>
    `);
    
    // 스토리보드 이미지 생성 시작
    generateStoryboardImages(persona, blobUrl, location);
}

// 4. html2canvas 설정 개선
function captureInsight() {
    const target = document.querySelector(".answerInner");
    
    // 이미지들이 모두 로드될 때까지 대기
    const images = target.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
                img.onerror = resolve; // 에러가 나도 진행
            }
        });
    });
    
    Promise.all(imagePromises).then(() => {
        html2canvas(target, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            foreignObjectRendering: false, // 추가
            imageTimeout: 15000, // 타임아웃 설정
            logging: false, // 디버깅용
            height: target.scrollHeight,
            width: target.scrollWidth
        }).then(canvas => {
            const imgData = canvas.toDataURL("image/png");
            
            // 다운로드 처리
            const link = document.createElement('a');
            link.download = 'insight_' + new Date().getTime() + '.png';
            link.href = imgData;
            link.click();
            
            // 로컬 저장
            const saveData = {
                image: imgData,
                timestamp: new Date().toISOString(),
                type: getActiveButtonType()
            };
            
            let savedInsights = JSON.parse(localStorage.getItem('savedInsights') || '[]');
            savedInsights.push(saveData);
            localStorage.setItem('savedInsights', JSON.stringify(savedInsights));
            
            alert("인사이트가 저장되었습니다!");
        }).catch(error => {
            console.error("캡처 오류:", error);
            alert("이미지 저장 중 오류가 발생했습니다: " + error.message);
        });
    });
}

// 5. 메모리 관리 - Blob URL 해제
function cleanupBlobUrls() {
    const images = document.querySelectorAll('img[src^="blob:"]');
    images.forEach(img => {
        URL.revokeObjectURL(img.src);
    });
}

// 퍼소나 프로필 부분 렌더링
function renderPersonaProfile(persona, location, imageUrl) {
    const personaHTML = `
        <div class="persona">
            <h3 class="needs">" ${persona.summary} "</h3>
            <div class="profile">
                <img src="${imageUrl || "/api/placeholder/400/400"}" alt="퍼소나 이미지" style="width:191px; height:191px; object-fit:cover;">
                <div class="info_title">
                    <h2>이름</h2>
                    <h2>나이</h2>
                    <h2>직업</h2>
                    <h2>거주지</h2>
                    <h2>성격</h2>
                </div>
                <div class="info_detail">
                    <p class="info_detail_p">${persona.name}</p>
                    <p class="info_detail_p">${persona.age}세 ${persona.gender}</p>
                    <p class="info_detail_p">${persona.occupation}</p>
                    <p class="info_detail_p">${location}</p>
                    <div class="characteristics">${persona.characteristics}</div>
                </div>
            </div>
        </div>
    `;
    
    // DOM에 프로필 내용 추가
    $(".answerInner").html(personaHTML);
}

// 스토리보드 이미지 생성
function generateStoryboardImages(persona, profileImageUrl = null, location = null) {
    if (!apiKey || apiKey.trim() === '') {
        // API 키가 없는 경우 기본 이미지로 스토리보드 렌더링
        renderStoryboard(persona, null, profileImageUrl, location);
        return;
    }
    
    let completedImages = 0;
    const totalScenarios = persona.scenario.length;
    const storyboardImagesUrls = new Array(totalScenarios);
    
    // 각 시나리오에 대한 이미지 생성
    persona.scenario.forEach((scenario, index) => {
        const storyPrompt = `
                Create an illustration of a scene where a Korean ${persona.gender} is doing ${scenario.content}.
                Please unify all the pictures in a webtoon style.
                Please clearly express the current situation of ${scenario.content} without including various types and elements. 
                Please use modern society as the background, unless it is a specific situation or background.
                Dress a white or black shirt or suit with clothes that match one's age and gender. Never wear a hanbok or traditional costume.
                Describes realistically possible backgrounds and objects.
                a Korean woman wearing modern casual clothes. a Korean man in a business suit.
                Please unify all images in illustration style, not live-action.
                현실적인 배경과 구도를 표현하세요. 예시를 들어 뜬금없이 도로한복판에서 미팅을 하거나 이상한 웹툰구조처럼 만들지 마세요.
                최대한 현실적이고 자연스럽게 표현하세요. `;
        
        callDalle(storyPrompt, function(imageUrl) {
            storyboardImagesUrls[index] = imageUrl || `/api/placeholder/498/257?text=스토리보드 ${index+1}`;
            completedImages++;
            
            // 모든 이미지가 생성되면 스토리보드 렌더링
            if (completedImages === totalScenarios) {
                renderStoryboard(persona, storyboardImagesUrls, profileImageUrl, location);
            }
        }, "1792x1024");
    });
    
    // 일정 시간 후에도 응답이 없으면 대체 이미지로 렌더링
    setTimeout(() => {
        if (completedImages < totalScenarios) {
            renderStoryboard(persona, null, profileImageUrl, location);
        }
    }, 15000); // 15초 타임아웃
}

// 6. 스토리보드 렌더링 시 Blob URL 사용
function renderStoryboard(persona, imageUrls = null, profileImageUrl = null, location = null) {
    const scenarioHTML = persona.scenario.map((ch, index) => {
        let imageSrc;
        if (imageUrls && imageUrls[index]) {
            // Data URL인 경우 Blob으로 변환
            if (imageUrls[index].startsWith('data:')) {
                const blob = dataURLToBlob(imageUrls[index]);
                imageSrc = URL.createObjectURL(blob);
            } else {
                imageSrc = imageUrls[index];
            }
        } else {
            imageSrc = `/api/placeholder/498/257?text=스토리보드 ${index+1}`;
        }
        
        return `
            <div class="storyboard-item">
                <div class="storyboard-number">
                    <img src="${imageSrc}" alt="스토리보드 ${index + 1} 이미지" width="498" height="257">
                    <h1 class="title">${index + 1}. ${ch.title}</h1>
                    <p class="content">${ch.content}</p>
                </div>
            </div>
        `;
    }).join("");
    
    // 프로필 이미지도 Blob URL로 처리
    let profileSrc = profileImageUrl;
    if (profileImageUrl && profileImageUrl.startsWith('data:')) {
        const blob = dataURLToBlob(profileImageUrl);
        profileSrc = URL.createObjectURL(blob);
    }
    
    $(".answerInner").html(`
        <div class="persona">
            <h3 class="needs">" ${persona.summary} "</h3>
            <div class="profile">
                <img src="${profileSrc || "/api/placeholder/400/400"}" alt="퍼소나 이미지">
                <div class="info_title">
                    <h2>이름</h2>
                    <h2>나이</h2>
                    <h2>직업</h2>
                    <h2>거주지</h2>
                    <h2>성격</h2>
                </div>
                <div class="info_detail">
                    <p class="info_detail_p">${persona.name}</p>
                    <p class="info_detail_p">${persona.age}세 ${persona.gender}</p>
                    <p class="info_detail_p">${persona.occupation}</p>
                    <p class="info_detail_p">${location || persona.place}</p>
                    <div class="characteristics">${persona.characteristics}</div>
                </div>
            </div>
        </div>
        
        <div class="storyboard">
            <h1>퍼소나 스토리 보드</h1>
            <div class="scenario">${scenarioHTML}</div>
        </div>
    `);
    
    $(".addNote").show();
}



// 파이어베이스 이미지 불러오기
function loadInsightImageFromFirestore(documentId) {
    const db = firebase.firestore();

    db.collection("post").doc(documentId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const imageData = data.imageData;

                if (imageData) {
                    const imgElement = document.getElementById("insightImage");
                    imgElement.src = imageData;
                    imgElement.style.display = "block";
                    console.log("✅ 이미지 로드 완료");
                } else {
                    console.warn("⚠️ 이미지 데이터가 없습니다.");
                }
            } else {
                console.warn("⚠️ 해당 문서를 찾을 수 없습니다.");
            }
        })
        .catch((error) => {
            console.error("❌ 이미지 로드 실패:", error);
        });
}

function loadLatestInsightImage() {
    const db = firebase.firestore();

    db.collection("post")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            if (data.imageData) {
                // 이미지 업데이트
                const imgElement = document.getElementById("insightImage");
                if (imgElement) {
                    imgElement.src = data.imageData;
                    imgElement.style.display = "block";
                }
                
                // 제목 업데이트
                const titleElement = document.querySelector('.paper-title');
                if (titleElement && data.title) {
                    titleElement.textContent = data.title;
                }
                
                // 타입 업데이트
                const typeElement = document.querySelector('.insight-title');
                if (typeElement && data.type) {
                    typeElement.textContent = data.type;
                }
                
                console.log("✅ 최신 인사이트 로드 완료");
                console.log(`제목: ${data.title}, 타입: ${data.type}`);
            }
        });
      })
      .catch((error) => {
          console.error("❌ Firestore 로드 실패:", error);
      });
}

document.addEventListener("DOMContentLoaded", () => {
    loadLatestInsightImage();  // 또는 특정 ID 사용 시: loadInsightImageFromFirestore("문서ID");
});

let savedInsights  = [];  // 저장된 이미지 배열
let currentImageIndex = 0; // 현재 인덱스

// 로컬스토리지 또는 Firestore에서 이미지 리스트 불러오기 (여기선 로컬스토리지 기준)
function loadSavedInsightImages() {
    filterAndLoadInsights(currentFilterType);
}


// 현재 인덱스의 이미지 보여주기
function showCurrentInsight() {
    const imgEl = document.getElementById("insightImage");
    const titleEl = document.querySelector('.paper-title');
    const typeEl = document.querySelector('.insight-title');
    const indexEl = document.querySelector('.top_left p span'); // "2/5" 부분
    
    if (!imgEl || savedInsights.length === 0) return;

    const currentInsight = savedInsights[currentImageIndex];
    
    // 이미지 업데이트
    imgEl.src = currentInsight.image;
    imgEl.style.display = "block";
    
    // 제목 업데이트
    if (titleEl) {
        titleEl.textContent = currentInsight.title;
    }
    
    // 타입 업데이트
    if (typeEl) {
        typeEl.textContent = currentInsight.type;
    }
    
    // 인덱스 업데이트 (현재 번호/전체 개수)
    if (indexEl) {
        indexEl.textContent = `${currentImageIndex + 1}/${savedInsights.length}`;
    }
    
    console.log(`✅ 인사이트 ${currentImageIndex + 1}/${savedInsights.length} 표시`);
    console.log(`제목: ${currentInsight.title}, 타입: ${currentInsight.type}`);
}

// 다음 인사이트로 이동 (수정됨)
function showNextInsight() {
    if (filteredInsights.length === 0) return;

    currentImageIndex = (currentImageIndex + 1) % filteredInsights.length; // 순환
    showFilteredInsight();
}

// 이전 인사이트로 이동 (수정됨)
function showPreviousInsight() {
    if (filteredInsights.length === 0) return;
    
    currentImageIndex = (currentImageIndex - 1 + filteredInsights.length) % filteredInsights.length;
    showFilteredInsight();
}

let filteredInsights = [];  // 필터링된 인사이트 배열
let currentFilterType = "디자인 브리프";  // 현재 선택된 필터 타입

// 타입 매핑 객체 (화면 표시명 -> Firebase 저장명)
const typeMapping = {
    "디자인 브리프": "디자인 브리프",
    "퍼소나 스토리": "퍼소나 스토리", 
    "디자인 가이드라인": "디자인 가이드라인e",
    "관련 자료 추천": "관련 자료 추천",
    "아이디어 생성 도우미": "아이디어 생성 도우미"
};

const reverseTypeMapping = {
    "design_brief": "디자인 브리프",
    "persona": "퍼소나 스토리",
    "design_guideline": "디자인 가이드라인", 
    "related_materials": "관련 자료 추천",
    "idea_helper": "아이디어 생성 도우미"
};

document.addEventListener('DOMContentLoaded', () => {
    // 인사이트 타입 클릭 이벤트 추가
    setupInsightTypeClickers();
    // 초기 인사이트 로딩
    loadSavedInsightImages();

    // 오른쪽 버튼 클릭 시 다음 인사이트
    const rightBtn = document.querySelector('.right_button');
    if (rightBtn) {
        rightBtn.addEventListener('click', showNextInsight);
    }

    // 왼쪽 버튼 클릭 시 이전 인사이트
    const leftBtn = document.querySelector('.left_button');
    if (leftBtn) {
        leftBtn.addEventListener('click', showPreviousInsight);
    }
    
});

// 인사이트 타입 클릭 이벤트 설정
function setupInsightTypeClickers() {
    const insightTypes = document.querySelectorAll('.five_name p');
    
    insightTypes.forEach(typeElement => {
        typeElement.addEventListener('click', function() {
            // 1. select-insight 클래스 이동
            document.querySelector('.five_name .select-insight')?.classList.remove('select-insight');
            this.classList.add('select-insight');
            
            // 2. 현재 필터 타입 업데이트
            currentFilterType = this.textContent.trim();
            
            // 3. 필터링된 이미지 로드
            filterAndLoadInsights(currentFilterType);
            
            console.log(`✅ 타입 변경: ${currentFilterType}`);
        });
    });
}

// 특정 타입의 인사이트만 필터링해서 로드
function filterAndLoadInsights(selectedType) {
    const db = firebase.firestore();
    const mappedType = typeMapping[selectedType] || selectedType;
    
    console.log(`🔍 필터링 시작: 선택된 타입="${selectedType}", 매핑된 타입="${mappedType}"`);
    
    // 먼저 전체 데이터를 가져와서 디버깅
    db.collection("post")
        .orderBy("timestamp", "desc")
        .get()
        .then((querySnapshot) => {
            console.log(`📊 전체 문서 수: ${querySnapshot.size}`);
            
            filteredInsights = [];
            let totalCount = 0;
            let matchedCount = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                totalCount++;
                
                console.log(`📄 문서 ${totalCount}: type="${data.type}", displayType="${data.displayType}", title="${data.title}"`);
                
                // 타입 매칭 로직 개선
                const isTypeMatch = data.type === mappedType || 
                                  data.displayType === selectedType ||
                                  data.type === selectedType;
                
                if (isTypeMatch && data.imageData) {
                    matchedCount++;
                    filteredInsights.push({
                        image: data.imageData,
                        title: data.title || "제목 없음",
                        type: data.type || "unknown",
                        displayType: data.displayType || reverseTypeMapping[data.type] || selectedType,
                        timestamp: data.timestamp,
                        documentId: doc.id
                    });
                    console.log(`✅ 매칭된 문서 ${matchedCount}: ${data.title}`);
                }
            });
            
            console.log(`🎯 필터링 결과: 전체 ${totalCount}개 중 ${matchedCount}개가 "${selectedType}" 타입과 매칭됨`);
            
            currentImageIndex = 0;
            showFilteredInsight();
            updateServiceIndex(filteredInsights, selectedType);
            
            if (filteredInsights.length === 0) {
                console.warn(`⚠️ "${selectedType}" 타입의 인사이트가 없습니다.`);
                showNoInsightsMessage(selectedType);
            }
        })
        .catch((error) => {
            console.error("❌ 필터링된 인사이트 로드 실패:", error);
            filteredInsights = [];
            currentImageIndex = 0;
            showNoInsightsMessage(selectedType);
        });
}

function showNoInsightsMessage(typeName) {
    const imgEl = document.getElementById("insightImage");
    const titleEl = document.querySelector('.paper-title');
    const typeEl = document.querySelector('.insight-title');
    const indexEl = document.querySelector('.top_left p span');
    
    if (imgEl) {
        imgEl.style.display = "none";
    }
    
    if (titleEl) {
        titleEl.textContent = `"${typeName}" 타입의 저장된 인사이트가 없습니다`;
    }
    
    if (typeEl) {
        typeEl.textContent = typeName;
    }
    
    if (indexEl) {
        indexEl.textContent = "0/0";
    }
    
    // 서비스 인덱스에도 메시지 표시
    const indexNumberEl = document.querySelector('.index_number');
    if (indexNumberEl) {
        indexNumberEl.innerHTML = `
            <div style="color: #666; font-style: italic;">
                "${typeName}" 타입의 인사이트를 생성한 후
                다시 확인해 주세요.
            </div>
        `;
    }
    
    console.log(`📋 "${typeName}" 타입에 대한 빈 상태 메시지 표시 완료`);
}

// 필터링된 인사이트 표시
function showFilteredInsight() {
    const imgEl = document.getElementById("insightImage");
    const titleEl = document.querySelector('.paper-title');
    const typeEl = document.querySelector('.insight-title');
    const indexEl = document.querySelector('.top_left p span');
    
    if (!imgEl) return;
    
    // 인사이트가 없는 경우
    if (filteredInsights.length === 0) {
        imgEl.style.display = "none";
        if (titleEl) titleEl.textContent = "해당 타입의 인사이트가 없습니다";
        if (typeEl) typeEl.textContent = currentFilterType;
        if (indexEl) indexEl.textContent = "0/0";
        return;
    }
    
    const currentInsight = filteredInsights[currentImageIndex];
    
    // 이미지 업데이트
    imgEl.src = currentInsight.image;
    imgEl.style.display = "block";
    
    // 제목 업데이트
    if (titleEl) {
        titleEl.textContent = currentInsight.title;
    }
    
    // 타입 업데이트
    if (typeEl) {
        typeEl.textContent = currentInsight.displayType || currentFilterType;
    }
    
    // 인덱스 업데이트
    if (indexEl) {
        indexEl.textContent = `${currentImageIndex + 1}/${filteredInsights.length}`;
    }
    
    console.log(`✅ ${currentFilterType} 인사이트 ${currentImageIndex + 1}/${filteredInsights.length} 표시`);
}

// 서비스 인덱스 업데이트
//여기를 지금 이미지로 대체해가지고 논문제목이 오도록 대체를 했는데
//나중에 세부적으로 글자랑 이미지 하나하나 가져오도록하면 다시 gpt를 거쳐서 내용을 한줄로 요약한 내용으로 대체해야할듯
function updateServiceIndex(insights, typeName) {
    const serviceNameEl = document.querySelector('.servicename');
    const indexNumberEl = document.querySelector('.index_number');
    
    if (serviceNameEl) {
        serviceNameEl.textContent = '"' + typeName + '" 종합요약';
    }
    
    if (indexNumberEl) {
        if (insights.length === 0) {
            indexNumberEl.innerHTML = '<div>해당 타입의 인사이트가 없습니다.</div>';
        } else {
            const indexHTML = insights.map((insight, index) => {
                const shortTitle = insight.title.length > 30 
                    ? insight.title.substring(0, 30) + "..."
                    : insight.title;
                return `<div>${index + 1}. ${shortTitle}</div>`;
            }).join('');
            
            indexNumberEl.innerHTML = indexHTML;
        }
    }
}

function loadAllInsightImages() {
    const db = firebase.firestore();
    db.collection("post").orderBy("timestamp", "asc").get()
        .then((querySnapshot) => {
            savedInsights = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.imageData) {
                    savedInsights.push({
                        image: data.imageData,
                        title: data.title || "제목 없음",
                        type: data.type || "unknown",
                        timestamp: data.timestamp
                    });
                }
            });
            console.log(`✅ 전체 인사이트 ${savedInsights.length}개 로드 완료`);
        })
        .catch((error) => {
            console.error("❌ 전체 인사이트 로드 실패:", error);
        });
}

// 7. 디버깅을 위한 전체 데이터 조회 함수
function debugFirestoreData() {
    const db = firebase.firestore();
    db.collection("post").get()
        .then((querySnapshot) => {
            console.log("🔍 === Firestore 전체 데이터 디버깅 ===");
            console.log(`전체 문서 수: ${querySnapshot.size}`);
            
            const typeCount = {};
            querySnapshot.forEach((doc, index) => {
                const data = doc.data();
                console.log(`문서 ${index + 1}:`, {
                    id: doc.id,
                    type: data.type,
                    displayType: data.displayType,
                    title: data.title,
                    timestamp: data.timestamp,
                    hasImage: !!data.imageData
                });
                
                // 타입별 개수 카운트
                const type = data.type || 'undefined';
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
            
            console.log("타입별 문서 개수:", typeCount);
            console.log("🔍 === 디버깅 완료 ===");
        })
        .catch((error) => {
            console.error("❌ 디버깅 중 오류:", error);
        });
}

// 8. 페이지 로드 시 디버깅 실행 (개발 중에만 사용)
document.addEventListener('DOMContentLoaded', () => {
    // 디버깅 함수 실행 (필요시 주석 해제)
    // setTimeout(() => {
    //     debugFirestoreData();
    // }, 2000);
});


// =========================================================요약 정리
// =========================================================요약 정리
// =========================================================요약 정리

function onSummarizeClick() {
    // 인사이트 타입 표시
    updateInsightTypeDisplay("디자인 브리프");
    
    $(".answerInner").html('<span class="loader"></span>');

    $(".addNote").hide();
    $(".userProject").hide();
    $(".projectIdea").hide();

    // 로딩 중이거나 텍스트가 비어있는 경우 처리
    if (isLoading) {
        alert("PDF를 읽는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }
    
    if (!cleanedText || cleanedText.trim() === '') {
        alert("PDF 파일을 먼저 업로드해 주세요.");
        return;
    }

    const maxLength = 4000;
    const truncatedText = cleanedText.length > maxLength 
        ? cleanedText.substring(0, maxLength) + "... (텍스트가 너무 길어 잘렸습니다)"
        : cleanedText;

    const briefPrompt = `
                다음 논문의 내용을 바탕으로 디자인 브리프와 같은 내용을 JSON 형식으로 제공해줘.

                논문 내용: "${truncatedText}"

                다음 JSON 형식에 맞게 응답해주세요:
                {
                "overview": "논문의 개요",
                "problem": "문제 정의",
                "goal": "디자인 목표",
                "target": "타깃 사용자",
                "Process": "연구 과정",
                "result": "핵심 인사이트",
                "guidelines": [
                    {
                        "title": "디자인 방향1",
                        "content": "디자인 방향1에 대한 간단한 내용1"
                    },
                    {
                        "title": "디자인 방향2",
                        "content": "디자인 방향1에 대한 간단한 내용2"
                    },
                    {
                        "title": "디자인 방향3",
                        "content": "디자인 방향1에 대한 간단한 내용3"
                    }
                ],
                "effective": "기대 효과"
                }

                guideline은 여러가지 디자인 방향이 있을테니 각 제목과 간단한 설명/내용을 넣어줘. 
                target와 guidelines를 제외한 모든 항목들은 최소150자로 상세하게 적어줘.
                말의 끝맺음은 "~한다." 또는 "~이다."로 해줘.
                반드시 유효한 JSON 형식으로 응답해주세요.
                `;

    callGPT(briefPrompt, function(error, briefData) {
        if (error) {
            console.error("🚨 브리프 추출 실패:", error);
            $(".answerInner").html(`<p>브리프 생성 중 오류가 발생했습니다: ${error.message}</p>`);
            return;
        }

        let briefJSON = {};
        try {
            // JSON 부분만 추출하는 정규식
            const jsonRegex = /{[\s\S]*}/;
            const match = briefData.match(jsonRegex);
            
            if (match) {
                briefJSON = JSON.parse(match[0]);
            } else {
                throw new Error("응답에서 JSON 형식을 찾을 수 없습니다.");
            }
        } catch (jsonError) {
            console.error("🚨 JSON 변환 오류:", jsonError);
            
            // JSON 파싱 실패 시 텍스트 형식으로 표시
            $(".answerInner").html(`
                <div class="error-message">
                    <h3>데이터 형식 오류</h3>
                    <p>브리프를 구조화하는데 문제가 발생했습니다. 원본 응답을 표시합니다:</p>
                    <pre>${briefData}</pre>
                </div>
            `);
            return;
        }
        
        // 응답 표시
        $(".answerInner").html(createBriefHTML(briefJSON));
        
        // 모든 내용이 생성된 후 .addNote 요소를 보이게 설정
        $(".addNote").show();
    });

    // 디자인 브리프 버튼을 활성화 상태로 설정
    const briefButton = document.querySelector('.action-btn[onclick*="onSummarizeClick"]');
    if (briefButton) {
        selectButton(briefButton);
    }
}

// =========================================================HTML 생성 함수들
function createBriefHTML(brief) {
    // 가이드라인 배열을 HTML로 변환
    const guidelinesHTML = brief.guidelines && brief.guidelines.length > 0 
        ? brief.guidelines.map((p, index) => `
            <table class="guidelineTable">
                <tr>
                    <td>${p.title}</td>
                    <td>${p.content}</td>
                </tr>
            </table>
        `).join('')
        : "";

    // 각 섹션별로 내용이 있는 경우에만 HTML 생성
    const sections = [
        { title: "프로젝트 개요", content: brief.overview },
        { title: "문제 정의(문제점 인식)", content: brief.problem },
        { title: "디자인 과제 및 목표", content: brief.goal },
        { title: "타겟 사용자", content: brief.target },
        { title: "연구 설계 및 과정(평가기준)", content: brief.Process },
        { title: "연구 결과(핵심 인사이트)", content: brief.result },
        { title: "디자인 방향", content: guidelinesHTML, isHTML: true },
        { title: "기대 효과", content: brief.effective }
    ];

    // 내용이 있는 섹션만 필터링하여 HTML 생성
    const sectionsHTML = sections
        .filter(section => section.content && section.content.trim() !== "")
        .map(section => `
            <div class="brief-section">
                <h1>${section.title}</h1>
                ${section.isHTML ? `<div>${section.content}</div>` : `<p>${section.content}</p>`}
            </div>
        `).join('');

    // 최종 HTML 반환
    return `
        <div class="briefInner">
            ${sectionsHTML}
        </div>
    `;
}

// =========================================================가이드라인 클릭
// =========================================================가이드라인 클릭
// =========================================================가이드라인 클릭
function onGuidelineClick(){
    updateInsightTypeDisplay("디자인 가이드라인");

    // 로딩 표시
    $(".answerInner").html('<span class="loader"></span>');

    $(".addNote").hide();
    $(".userProject").hide();
    $(".projectIdea").hide();


    // 로딩 중이거나 텍스트가 비어있는 경우 처리
    if (isLoading) {
        alert("논문을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }
    
    if (!cleanedText || cleanedText.trim() === '') {
        alert("논문 내용을 먼저 불러와 주세요.");
        return;
    }

    const maxLength = 4000;
    const truncatedText = cleanedText.length > maxLength 
        ? cleanedText.substring(0, maxLength) + "... (텍스트가 너무 길어 잘렸습니다)"
        : cleanedText;

        const guidelinePrompt =`다음 논문 내용${truncatedText}을 보고 논문에서 설명하는 디자인 시스템 및 디자인가이드라인을 JSON 형식으로 제공해줘:
                                {
                                    "description": [
                                        {
                                            "title": "제목1",
                                            "content": "내용1"
                                        },
                                        {
                                            "title": "제목2",
                                            "content": "내용2"
                                        },
                                        {
                                            "title": "제목3",
                                            "content": "내용3"
                                        }
                                    ]
                                }
                                description은 논문에서 설명하는 결론 중에서 디자인 시스템과 같은 가이드라인을 3가지로 정리한 내용입니다.
                                예를 들어 "노인들은 다른 사용자에 비해 전체적인 ui를 20% 크게하여 디자인해야한다."
                                또는 "버튼은 색상과 위치로 시각적인 강조하는 디자인"와 같은 것이 있다.
                                content는 200자~300자로 설명하세요. 말의 끝맺음은 "~한다." 또는 "~이다."로 해주세요.
                                반드시 유효한 JSON 형식으로 응답해주세요. 모든 언어는 한국어로 작성해주세요.
                                `


    callGPT(guidelinePrompt, function (error, guidelineData) {
        if (error) {
            console.error("🚨 디자인가이드라인 추출 실패:", error);
            $(".answerInner").html("<p>디자인가이드라인 생성 중 오류가 발생했습니다.</p>");
            return;
        }

        // 🔹 JSON 데이터 파싱
        let guidelineJSON = {};
        try {
            // JSON 부분만 추출하는 정규식
            const jsonRegex = /{[\s\S]*}/;
            const match = guidelineData.match(jsonRegex);
            
            if (match) {
                guidelineJSON = JSON.parse(match[0]);
            } else {
                throw new Error("응답에서 JSON 형식을 찾을 수 없습니다.");
            }
        } catch (jsonError) {
            console.error("🚨 JSON 변환 오류:", jsonError);
            $(".answerInner").html(`
                <div class="error-message">
                    <h3>데이터 형식 오류</h3>
                    <p>디자인가이드라인을 구조화하는데 문제가 발생했습니다. 원본 응답을 표시합니다:</p>
                    <pre>${guidelineData}</pre>
                </div>
            `);
            return;
        }

       // JSON 파싱이 성공하면 이미지 생성 시작
        generateGuidelineImages(guidelineJSON);
    });

    const guidelineButton = document.querySelector('.action-btn[onclick*="onGuidelineClick"]');
    if (guidelineButton) {
        selectButton(guidelineButton);
    }
}

function generateGuidelineImages(guideline, location = null){
    if (!apiKey || apiKey.trim() === '') {
        // API 키가 없는 경우 기본 이미지로 스토리보드 렌더링
        renderGuideline(guideline, null, location);
        return;
    }

    // guideline 객체가 올바른 구조인지 확인
    if (!guideline || !guideline.description || !Array.isArray(guideline.description)) {
        console.error("🚨 가이드라인 데이터 구조 오류:", guideline);
        renderGuideline({ description: [] }, null, location);
        return;
    }
    
    let completedImages = 0;
    const totalDescriptions = guideline.description.length;
    const guidelineImagesUrls = new Array(totalDescriptions);
    
    // 각 가이드라인 항목에 대한 이미지 생성
    guideline.description.forEach((description, index) => {
        // title 또는 content가 비어 있으면 해당 항목 스킵
        if (!description.title?.trim() || !description.content?.trim()) {
            console.warn(`🚨 가이드라인 ${index + 1} 항목에 title 또는 content가 비어 있습니다. 생략합니다.`);
            guidelineImagesUrls[index] = `/api/placeholder/498/257?text=디자인가이드라인 ${index+1}`;
            completedImages++;
            return;
        }
    
        const guidelinePrompt = `Create a image that expresses "${description.title}" and "${description.content}" well. 
                                Make the most of 1~3 colors, lines, and shapes. 
                                Style: minimal, modern, simple shapes and clear. 
                                Focus on UI/UX design.
                                Make the image as concise as possible.
                                Don't use too many elements and colors.
                                When showing right and wrong, create images that can be compared by dividing them into left and right. 
                                For example, if you need to use a character size that is 20% larger for the elderly in the difference between regular work and the elderly, 
                                create a display that is viewed by the public on the left and a display that is viewed by the elderly on the right with a 20% increase on one image.
                                필요할 경우에만 비교형식으로 이미지를 생성하고 이 외에는 최소한의 요소와 색상을 사용하여 간결하게 표현하세요.
                                예를 들어 버튼의 색상과 크기에 대한 디자인 가이드라인의 경우 간단한 문구 "정말로 취소하시겠습니까?"에서
                                하단에는 취소와 확인 버튼 두가지만 두고 색상의 차이를 주어 대비를 통한 강조를 전달할 수 있습니다.
                                Please change all languages to Korean`;
    
        callDalle(guidelinePrompt, function(imageUrl) {
            guidelineImagesUrls[index] = imageUrl || `/api/placeholder/498/257?text=디자인가이드라인 ${index+1}`;
            completedImages++;
    
            if (completedImages === totalDescriptions) {
                renderGuideline(guideline, guidelineImagesUrls, location);
            }
        }, "1792x1024");
    });
    
    
    // 일정 시간 후에도 응답이 없으면 대체 이미지로 렌더링
    setTimeout(() => {
        if (completedImages < totalDescriptions) {
            console.warn("일부 이미지 생성이 완료되지 않아 기본 이미지로 렌더링합니다.");
            renderGuideline(guideline, null, location);
        }
    }, 15000); // 15초 타임아웃
}

// 가이드라인인 렌더링
function renderGuideline(guideline, imageUrls = null, location = null){
    const descriptionHTML = guideline.description.map((ch, index) => `
        <div class="guideline-item">
            <div class="guideline-number">
                <h1 class="title">${index + 1}. ${ch.title}</h1>
                <p class="content">${ch.content}</p>
                <img src="${imageUrls ? imageUrls[index] : `/api/placeholder/498/257?text=디자인가이드라인 ${index+1}`}" alt="디자인가이드라인 ${index + 1} 이미지" width="498" height="257">
            </div>
        </div>
    `).join("");
    
    // 이미지 생성이 완료되면 전체 내용을 한 번에 표시
    $(".answerInner").html(`
        <div class="guideline">
            <div class="guidelineDep">${descriptionHTML}</div>
        </div>
    `);
    
    // 콘텐츠 생성 후 노트 추가 버튼 표시
    $(".addNote").show();
}

// 이미지 URL이 있을 때 퍼소나 렌더링
function renderGuidelineWithImage(guideline, location, imageUrl) {
    // 가이드라인인 이미지 생성 시작
    generateGuidelineImages(guideline, imageUrl, location);
}

// =========================================================관련 논문 추천
// =========================================================관련 논문 추천
// =========================================================관련 논문 추천
function onRecommendClick() {
    updateInsightTypeDisplay("관련 자료 추천");

    $(".answerInner").html('<span class="loader"></span>');
    $(".addNote").hide();
    $(".userProject").hide();
    $(".projectIdea").hide();

    if (isLoading) {
        alert("PDF를 읽는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    if (!cleanedText || cleanedText.trim() === '') {
        alert("PDF 파일을 먼저 업로드해 주세요.");
        return;
    }

    const maxLength = 4000;
    const truncatedText = cleanedText.length > maxLength 
        ? cleanedText.substring(0, maxLength) + "... (텍스트가 너무 길어 잘렸습니다)"
        : cleanedText;

    const recommendPrompt = `
        다음 논문 내용 ${truncatedText} 을 참고해서 다음 3가지 주제를 각각 2~3개씩 추천해줘, related_news는 2개만:

        1. 논문과 관련된 "논문 검색 키워드" (한국어, 학술적으로 많이 쓰이는 표현)
        2. 논문과 관련된 "뉴스 검색 키워드" (실제 뉴스 기사에서 쓸법한 표현을 짧고 간단하게)
        3. 논문과 관련된 "디자인 템플릿 키워드" (UI/UX 디자인에서 자주 쓰는 짧고 간단한 키워드, 반드시 영어로 작성해줘)

        응답 형식은 반드시 JSON 형식으로:
        {
        "related_papers": [
            { "keyword": "..." }
        ],
        "related_news": [
            { "keyword": "..." }
        ],
        "related_templates": [
            { "keyword": "..." }
        ]
        }
        `;

    callGPT(recommendPrompt, function(error, recommendData) {
        if (error) {
            console.error("🚨 GPT 호출 실패:", error);
            $(".answerInner").html(`<p>추천 키워드 생성 중 오류가 발생했습니다: ${error.message}</p>`);
            return;
        }

        let recommendJSON = {};
        try {
            const jsonRegex = /{[\s\S]*}/;
            const match = recommendData.match(jsonRegex);
            if (match) {
                recommendJSON = JSON.parse(match[0]);
            } else {
                throw new Error("응답에서 JSON 형식을 찾을 수 없습니다.");
            }
        } catch (jsonError) {
            console.error("🚨 JSON 파싱 오류:", jsonError);
            $(".answerInner").html(`
                <div class="error-message">
                    <h3>데이터 형식 오류</h3>
                    <p>추천 키워드를 구조화하는 데 실패했습니다. 원본 응답을 표시합니다:</p>
                    <pre>${recommendData}</pre>
                </div>
            `);
            return;
        }

        const paperLinks = (recommendJSON.related_papers || []).map(k => {
            const q = encodeURIComponent(k.keyword);
            return `
                <a href="https://www.riss.kr/search/Search.do?query=${q}" target="_blank">
                    <div class="templateRecommendInner">
                        <h3>${k.keyword}</h3>
                        <div class="shortcut"><p>RISS 검색</p><img src="img/shortcut.png" alt="" width="50%"></div>
                    </div>
                </a>`;
        }).join("");

        const templateLinks = (recommendJSON.related_templates || []).map(k => {
            const q = encodeURIComponent(k.keyword);
            return `
                <a href="https://freebiesui.com/?s=${q}" target="_blank">
                    <div class="templateRecommendInner">
                        <h3>${k.keyword}</h3>
                        <div class="shortcut"><p>FreebiesUI 검색</p><img src="img/shortcut.png" alt="" width="50%"></div>
                    </div>
                </a>`;
            }).join("");

            const newsLinks = (recommendJSON.related_news || []).map(k => {
                const q = encodeURIComponent(k.keyword);
                return `
                    <div class="newsRecommendInner">
                        <h3>${k.keyword}</h3>
                        <a href="https://search.naver.com/search.naver?where=news&query=${q}" target="_blank">
                            <div class="shortcut"><p>네이버 뉴스 검색</p><img src="img/shortcut.png" alt="" width="50%"></div>
                        </a>
                    </div>`;
            }).join("");

        $(".answerInner").html(`
            <div class="recommend">
                <div class="paperRecommend">
                    <h2>관련 논문 키워드 검색</h2>
                    <div class="gap12">${paperLinks}</div>
                </div>
                <div class="templateRecommend">
                <h2>활용 가능한 템플릿 키워드 검색</h2>
                <div class="gap12">${templateLinks}</div>
                </div>
                <div class="newsRecommend">
                    <h2>관련 뉴스 키워드 검색</h2>
                    <div class="flexgap10">${newsLinks}</div>
                </div>
            </div>
        `);

        $(".addNote").show();
    });

    const recommendButton = document.querySelector('.action-btn[onclick*="onRecommendClick"]');
    if (recommendButton) {
        selectButton(recommendButton);
    }
}

// ========================================================아이디어 생성
// ========================================================아이디어 생성
// ========================================================아이디어 생성 버튼 클릭
function onIdeaClick() {
    updateInsightTypeDisplay("아이디어 생성 도우미");

    $(".addNote").hide();
    $(".answerInner").empty();
    $(".userProject").show();


    // 로딩 중이거나 텍스트가 비어있는 경우 처리
    if (isLoading) {
        alert("PDF를 읽는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    if (!cleanedText || cleanedText.trim() === '') {
        alert("PDF 파일을 먼저 업로드해 주세요.");
        return;
    }

    // ⚠️ 이미 이벤트가 바인딩되어 있으면 중복 방지를 위해 기존 것을 제거
    const projectButton = document.querySelector(".projectRight");
    const newButton = projectButton.cloneNode(true);
    projectButton.parentNode.replaceChild(newButton, projectButton);

    newButton.addEventListener("click", function() {
        const projectName = document.querySelector('.writeInner').value.trim();
        $(".projectIdea").show();

        // 로딩 표시
        $(".projectIdea").html('<span class="loader"></span>');


        if (!projectName) {
            alert('프로젝트 이름을 입력해주세요.');
            return;
        }

        const ideaPrompt = `
            다음 프로젝트 내용 "${projectName}"을 보고 논문을 참고하여 해당 프로젝트에 도움이 될 수 있는 아이디어를 JSON 형식으로 제공해줘:
            [
            {
                "title": "추천 아이디어 제목1",
                "content": "추천 아이디어 내용1"
            },
            {
                "title": "추천 아이디어 제목2",
                "content": "추천 아이디어 내용2"
            },
            {
                "title": "추천 아이디어 제목3",
                "content": "추천 아이디어 내용3"
            }
            ]
            title은 아이디어의 제목이고, content는 200자~300자로 설명해 주세요. 반드시 JSON 배열 형식으로 응답해 주세요. 모든 내용은 한국어로 작성하세요.`;

        // GPT API 호출
        callGPT(ideaPrompt, function(error, ideaData) {
            $(".answerInner").html('');

            if (error) {
                console.error("🚨 아이디어 생성 실패:", error);
                $(".projectIdea").html(`<p>아이디어 생성 중 오류가 발생했습니다: ${error.message}</p>`);
                return;
            }

            let ideasArray = [];
            try {
                const jsonRegex = /\[([\s\S]*)\]/;
                const match = ideaData.match(jsonRegex);

                if (match) {
                    ideasArray = JSON.parse(match[0]);
                } else {
                    throw new Error("응답에서 JSON 배열을 찾을 수 없습니다.");
                }
            } catch (jsonError) {
                console.error("🚨 JSON 변환 오류:", jsonError);
                $(".projectIdea").html(`
                    <div class="error-message">
                        <h3>데이터 형식 오류</h3>
                        <p>아이디어를 구조화하는데 문제가 발생했습니다. 원본 응답을 표시합니다:</p>
                        <pre>${ideaData}</pre>
                    </div>
                `);
                return;
            }
            $(".projectIdea").show();
            // $(".projectIdea").html('<span class="loader"></span>');
            $(".projectIdea").html(createIdeaHTML(ideasArray, projectName));
            $(".addNote").show();
        });
    });

    const ideaButton = document.querySelector('.action-btn[onclick*="onIdeaHelperClick"]');
    if (ideaButton) {
        selectButton(ideaButton);
    }
}

// ========================================================아이디어 HTML 생성 함수
function createIdeaHTML(ideas, projectName) {
    const projectHeader = projectName ? `
        <div class="project-header">
            <h2>프로젝트: ${projectName}</h2>
        </div>
    ` : "";

    const ideasHTML = ideas.map((idea, index) => `
        <div class="idea-card">
            <h3>${index + 1}. ${idea.title}</h3>
            <p>${idea.content}</p>
        </div>
    `).join("");

    return `
        <div class="idea-container">
            ${projectHeader}
            ${ideasHTML}
        </div>
    `;
}
