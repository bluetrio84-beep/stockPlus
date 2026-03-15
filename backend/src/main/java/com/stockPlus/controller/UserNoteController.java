package com.stockPlus.controller;

import com.stockPlus.domain.UserNote;
import com.stockPlus.mapper.UserNoteMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/dashboard/notes")
@RequiredArgsConstructor
public class UserNoteController {

    private final UserNoteMapper userNoteMapper;
    private final String uploadDir = "/app/img/notes"; // [v35.00] 이미지 저장 절대 경로

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("image") MultipartFile file) {
        try {
            if (file.isEmpty()) return ResponseEntity.badRequest().build();

            // 1. 폴더 생성 확인
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            // 2. 파일명 생성 (UUID)
            String extension = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."));
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadDir, fileName);

            // 3. 파일 저장
            Files.write(filePath, file.getBytes());
            log.info(">>> [Journal] Image Uploaded: {}", fileName);

            // 4. 접근 URL 반환 (Nginx/Spring 정적 리소스 매핑 경로)
            return ResponseEntity.ok(Collections.singletonMap("url", "/stockPlus/api/notes/images/" + fileName));
        } catch (Exception e) {
            log.error(">>> [Journal] Upload Error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private String getCurrentUsrId() {
        try {
            String principal = SecurityContextHolder.getContext().getAuthentication().getName();
            return ("anonymousUser".equals(principal) || principal == null) ? "bluetrio" : principal;
        } catch (Exception e) {
            return "bluetrio";
        }
    }

    @GetMapping
    public List<UserNote> getAllNotes() {
        return userNoteMapper.findAllByUsrId(getCurrentUsrId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserNote> getNote(@PathVariable Long id) {
        userNoteMapper.incrementViewCount(id);
        UserNote note = userNoteMapper.findByIdAndUsrId(id, getCurrentUsrId());
        return note != null ? ResponseEntity.ok(note) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public UserNote createNote(@RequestBody UserNote note) {
        note.setUsrId(getCurrentUsrId());
        if (note.getCategory() == null) note.setCategory("GENERAL");
        userNoteMapper.insert(note);
        return note;
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserNote> updateNote(@PathVariable Long id, @RequestBody UserNote note) {
        note.setId(id);
        note.setUsrId(getCurrentUsrId());
        int updated = userNoteMapper.update(note);
        return updated > 0 ? ResponseEntity.ok(note) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        int deleted = userNoteMapper.delete(id, getCurrentUsrId());
        return deleted > 0 ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
