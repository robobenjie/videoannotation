document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const playerContainer = document.getElementById('player-container');
    const videoPlayer = document.getElementById('video-player');
    const fileInput = document.getElementById('file-input');
    const chooseButton = document.getElementById('choose-button');
    const annotationList = document.getElementById('annotation-list');
    const addAnnotationButton = document.getElementById('add-annotation');
    const modal = document.getElementById('annotation-modal');
    const modalSave = document.getElementById('modal-save');
    const modalCancel = document.getElementById('modal-cancel');
    const timeline = document.getElementById('timeline');
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineMarker = document.getElementById('timeline-marker');
    const scrubMinTime = 60; //ms
    const finishButton = document.getElementById('finish-annotation');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect, false);
    
    // Handle choose button click
    chooseButton.addEventListener('click', () => fileInput.click());

    // Update the keyboard controls
    document.addEventListener('keydown', (e) => {
        // Don't handle video controls if modal is open
        if (modal.classList.contains('hidden')) {
            // Only handle keyboard events if video is loaded
            if (videoPlayer.src) {
                if (e.code === 'Space') {
                    e.preventDefault(); // Prevent page scroll
                    if (videoPlayer.paused) {
                        videoPlayer.play();
                    } else {
                        videoPlayer.pause();
                    }
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    // Rewind 2 seconds
                    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 2);
                } else if (e.code === 'Enter') {
                    e.preventDefault();
                    tryFinishAnnotation();
                } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                    console.log("Shifty")
                    shiftDown = true;
                    shiftStartPos = videoPlayer.currentTime;
                } else {
                    // Check for annotation key bindings
                    const key = e.key.toLowerCase();
                    const matchingAnnotation = initialAnnotations.find(a => a.key === key);
                    if (matchingAnnotation) {
                        e.preventDefault();
                        if (activeAnnotation?.type === matchingAnnotation.text) {
                            // If same annotation type is active, do nothing
                        } else {
                            // Start new annotation of this type
                            startAnnotation(matchingAnnotation.text, matchingAnnotation.color);
                        }
                    }
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        // Don't handle video controls if modal is open
        if (modal.classList.contains('hidden')) {
            // Only handle keyboard events if video is loaded
            if (videoPlayer.src) {
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                    shiftDown = false;
                }
            }
        }
    });

    // Initial annotations with suggested colors
    let initialAnnotations = [
        { text: 'Walking', key: 'w', color: '#FF6B6B' },
        { text: 'Seeking', key: 's', color: '#4ECDC4' },
        { text: 'Grabbing', key: 'g', color: '#45B7D1' },
        { text: 'Scanning', key: 'c', color: '#96CEB4' },
        { text: 'Putting', key: 'p', color: '#FFEEAD' },
        { text: 'Fiddling with scanner', key: 'f', color: '#D4A5A5' }
    ];

    // Add annotation button click handler
    addAnnotationButton.addEventListener('click', () => {
        modal.classList.remove('hidden');
        document.getElementById('annotation-text').value = '';
        document.getElementById('annotation-key').value = '';
        document.getElementById('annotation-color').value = generateRandomColor();
    });

    // Modal handlers
    modalSave.addEventListener('click', () => {
        const text = document.getElementById('annotation-text').value;
        const key = document.getElementById('annotation-key').value.toLowerCase();
        const color = document.getElementById('annotation-color').value;

        if (text && key) {
            createAnnotationElement({ text, key, color });
            modal.classList.add('hidden');
        }
    });

    modalCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        uploadArea.classList.add('dragover');
    }

    function unhighlight(e) {
        uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                videoPlayer.src = url;
                uploadArea.classList.add('hidden');
                playerContainer.classList.remove('hidden');
                // Initialize annotations after video is loaded
                initialAnnotations.forEach(annotation => {
                    createAnnotationElement(annotation);
                });
            } else {
                alert('Please upload a video file.');
            }
        }
    }

    function createAnnotationElement(annotation) {
        const div = document.createElement('div');
        div.className = 'annotation-item';
        div.innerHTML = `
            <span>${annotation.text} (${annotation.key})</span>
            <span class="color-dot" style="background-color: ${annotation.color}"></span>
            <button class="remove-button">×</button>
        `;

        // Add click handler for annotation
        div.addEventListener('click', () => {
            startAnnotation(annotation.text, annotation.color);
        });

        div.querySelector('.remove-button').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the div's click handler
            div.remove();
        });

        annotationList.appendChild(div);
        initialAnnotations.push(annotation)
    }

    function generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEEAD', '#D4A5A5', '#88D8B0', '#FFCC5C', 
            '#FF855C', '#CC99FF'
        ];
        const usedColors = Array.from(document.querySelectorAll('.color-dot'))
            .map(dot => dot.style.backgroundColor);
        
        const availableColors = colors.filter(color => !usedColors.includes(color));
        if (availableColors.length === 0) {
            // If all colors are used, generate a random one
            return '#' + Math.floor(Math.random()*16777215).toString(16);
        }
        return availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    // Add at the top with other state variables
    let isHovering = false;
    let activeAnnotation = null;
    let annotations = [];

    // Add video time update handler
    videoPlayer.addEventListener('timeupdate', () => {
        if (!isHovering) {
            const progress = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            timeline.style.width = `${progress}%`;
            timelineMarker.style.left = `${progress}%`;
        }
        updateActiveAnnotation();
    });

    // Update the timeline hover preview
    let originalTime = 0;
    let isDragging = false;
    let scrubbed = false;

    let shiftDown = false;
    let shiftStartPos = 0;

    timelineContainer.addEventListener('mouseenter', () => {
        if (!isDragging) {
            originalTime = videoPlayer.currentTime;
            isHovering = true;
        }
    });

    timelineContainer.addEventListener('mousemove', (e) => {
        if (!isDragging && !scrubbed) {
            scrubbed = true;
            const rect = timelineContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            let target = pos * videoPlayer.duration;
            if (shiftDown) {
                let delta = target - shiftStartPos;
                videoPlayer.currentTime = shiftStartPos + delta / 10;
            } else {
                videoPlayer.currentTime = target;
            }
            setTimeout(() => {scrubbed = false;}, scrubMinTime);
        }
    });

    timelineContainer.addEventListener('mouseleave', () => {
        if (!isDragging) {
            videoPlayer.currentTime = originalTime;
            isHovering = false;
            // Update visuals to match original time
            const progress = (originalTime / videoPlayer.duration) * 100;
            timeline.style.width = `${progress}%`;
            timelineMarker.style.left = `${progress}%`;
        }
    });

    timelineContainer.addEventListener('click', (e) => {
        const rect = timelineContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        target = pos * videoPlayer.duration;
        if (shiftDown) {
            let delta = target - shiftStartPos;
            videoPlayer.currentTime = shiftStartPos + delta / 10;
        } else {
            videoPlayer.currentTime = target;
        }
        originalTime = videoPlayer.currentTime;
        isDragging = false;
        
        // Update visuals immediately on click
        const progress = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        timeline.style.width = `${progress}%`;
        timelineMarker.style.left = `${progress}%`;
        
        // Stay in hover mode but update originalTime to new position
        isHovering = true;
    });

    // Add document mouseup to handle drag end outside timeline
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function startAnnotation(type, color) {
        // If there's an active annotation, finish it first
        if (activeAnnotation) {
            finishAnnotation();
        }
        
        // Update active button state
        document.querySelectorAll('.annotation-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('span').textContent.includes(type)) {
                item.classList.add('active');
                item.style.borderColor = color;
            }
        });
        
        activeAnnotation = {
            type,
            color,
            start: videoPlayer.currentTime,
            end: videoPlayer.currentTime
        };
        finishButton.disabled = false;  // Enable button when annotation starts
    }

    function finishAnnotation() {
        // Remove active state from buttons
        document.querySelectorAll('.annotation-item').forEach(item => {
            item.classList.remove('active');
        });

        if (activeAnnotation && activeAnnotation.start !== activeAnnotation.end) {
            const newStart = Math.min(activeAnnotation.start, activeAnnotation.end);
            const newEnd = Math.max(activeAnnotation.start, activeAnnotation.end);
            
            // Find all affected annotations
            const overlapping = annotations.filter(a => {
                return !(a.end <= newStart || a.start >= newEnd);
            });
            
            // Remove fully covered annotations
            annotations = annotations.filter(a => {
                return !(a.start >= newStart && a.end <= newEnd);
            });
            
            // Handle partial overlaps and splits
            overlapping.forEach(annotation => {
                if (annotation.start < newStart && annotation.end > newEnd) {
                    // This annotation completely contains the new one - split it
                    // Modify the original to be the first part
                    const originalEnd = annotation.end;
                    annotation.end = newStart;
                    // Create new annotation only for the second part
                    annotations.push({
                        ...annotation,
                        start: newEnd,
                        end: originalEnd
                    });
                } else {
                    // Handle partial overlaps as before
                    if (annotation.start < newStart && annotation.end > newStart) {
                        // Trim end at new start
                        annotation.end = newStart;
                    }
                    if (annotation.start < newEnd && annotation.end > newEnd) {
                        if (annotation.start <= newStart) {
                            // Create new annotation for the part after newEnd
                            annotations.push({
                                ...annotation,
                                start: newEnd,
                            });
                        } else {
                            // Just move start to newEnd
                            annotation.start = newEnd;
                        }
                    }
                }
            });
            
            // Add the new annotation
            annotations.push({
                type: activeAnnotation.type,
                color: activeAnnotation.color,
                start: newStart,
                end: newEnd
            });
            
            // Merge adjacent annotations of same type
            let merged;
            do {
                merged = false;
                for (let i = 0; i < annotations.length; i++) {
                    for (let j = i + 1; j < annotations.length; j++) {
                        const a = annotations[i];
                        const b = annotations[j];
                        if (a.type === b.type && 
                            (Math.abs(a.end - b.start) < 0.001 || Math.abs(b.end - a.start) < 0.001)) {
                            // Merge them
                            a.start = Math.min(a.start, b.start);
                            a.end = Math.max(a.end, b.end);
                            annotations.splice(j, 1);
                            merged = true;
                            break;
                        }
                    }
                    if (merged) break;
                }
            } while (merged);
            
            // Clear and redraw all annotations
            const existingAnnotations = timelineContainer.querySelectorAll('.timeline-annotation:not(.timeline-annotation-active)');
            existingAnnotations.forEach(el => el.remove());
            annotations.forEach(renderAnnotationOnTimeline);
        }
        
        // Remove active annotation visual and clear active state
        const activeBar = timelineContainer.querySelector('.timeline-annotation-active');
        if (activeBar) activeBar.remove();
        activeAnnotation = null;
        finishButton.disabled = true;  // Disable button when annotation finishes

        // Update the table
        updateAnnotationTable();
    }

    function updateActiveAnnotation() {
        if (activeAnnotation) {
            const currentTime = videoPlayer.currentTime;
            if (currentTime < activeAnnotation.start) {
                activeAnnotation.end = activeAnnotation.start;
                activeAnnotation.start = currentTime;
            } else {
                activeAnnotation.end = currentTime;
            }
            updateActiveAnnotationVisual();
        }
    }

    function renderAnnotationOnTimeline(annotation) {
        const bar = document.createElement('div');
        bar.className = 'timeline-annotation';
        const startPercent = (annotation.start / videoPlayer.duration) * 100;
        const endPercent = (annotation.end / videoPlayer.duration) * 100;
        bar.style.left = `${startPercent}%`;
        bar.style.width = `${endPercent - startPercent}%`;
        bar.style.backgroundColor = annotation.color;
        
        // Add tooltip
        const duration = annotation.end - annotation.start;
        bar.title = `${annotation.type} (${duration.toFixed(2)}s)`;
        
        timelineContainer.appendChild(bar);
    }

    function updateActiveAnnotationVisual() {
        let activeBar = timelineContainer.querySelector('.timeline-annotation-active');
        if (!activeBar) {
            activeBar = document.createElement('div');
            activeBar.className = 'timeline-annotation timeline-annotation-active';
            timelineContainer.appendChild(activeBar);
        }

        const startPercent = (activeAnnotation.start / videoPlayer.duration) * 100;
        const endPercent = (activeAnnotation.end / videoPlayer.duration) * 100;
        
        activeBar.style.left = `${startPercent}%`;
        activeBar.style.width = `${endPercent - startPercent}%`;
        activeBar.style.backgroundColor = activeAnnotation.color;
        
        // Add tooltip for active annotation too
        const duration = activeAnnotation.end - activeAnnotation.start;
        activeBar.title = `${activeAnnotation.type} (${duration.toFixed(2)}s)`;
    }

    function updateAnnotationTable() {
        // Calculate total duration for each type
        const durationByType = {};
        const totalDuration = videoPlayer.duration;
        
        annotations.forEach(annotation => {
            if (!durationByType[annotation.type]) {
                durationByType[annotation.type] = {
                    duration: 0,
                    color: annotation.color
                };
            }
            durationByType[annotation.type].duration += annotation.end - annotation.start;
        });

        // Update summary table
        const summaryTbody = document.querySelector('#summary-table tbody');
        summaryTbody.innerHTML = '';
        
        Object.entries(durationByType).forEach(([type, data]) => {
            const percentage = ((data.duration / totalDuration) * 100).toFixed(1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="color-dot" style="background-color: ${data.color}"></span>
                    ${type}
                </td>
                <td>${formatTime(data.duration)}</td>
                <td>${percentage}%</td>
            `;
            summaryTbody.appendChild(row);
        });

        // Update details table
        const detailsTbody = document.querySelector('#annotation-table tbody');
        detailsTbody.innerHTML = '';
        
        const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);
        sortedAnnotations.forEach(annotation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="color-dot" style="background-color: ${annotation.color}"></span>
                    ${annotation.type}
                </td>
                <td>${formatTime(annotation.start)}</td>
                <td>${formatTime(annotation.end)}</td>
            `;
            detailsTbody.appendChild(row);
        });
    }

    // Add export functionality
    document.getElementById('export-csv').addEventListener('click', () => {
        // Prepare summary data
        let csvContent = "Summary\nType,Total Time,Percentage\n";
        const totalDuration = videoPlayer.duration;
        
        const durationByType = {};
        annotations.forEach(annotation => {
            if (!durationByType[annotation.type]) {
                durationByType[annotation.type] = 0;
            }
            durationByType[annotation.type] += annotation.end - annotation.start;
        });
        
        Object.entries(durationByType).forEach(([type, duration]) => {
            const percentage = ((duration / totalDuration) * 100).toFixed(1);
            csvContent += `${type},${formatTime(duration)},${percentage}%\n`;
        });
        
        // Add details
        csvContent += "\nDetails\nType,Start Time,End Time\n";
        annotations.sort((a, b) => a.start - b.start).forEach(annotation => {
            csvContent += `${annotation.type},${formatTime(annotation.start)},${formatTime(annotation.end)}\n`;
        });
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "annotations.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const msecs = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${msecs.toString().padStart(3, '0')}`;
    }

    // Move the finish logic to a common function
    function tryFinishAnnotation() {

        if (activeAnnotation) {
            finishAnnotation();
        }
    }

    finishButton.addEventListener('click', tryFinishAnnotation);
}); 