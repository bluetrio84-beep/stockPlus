package com.stockPlus.controller;

import com.stockPlus.domain.UserNote;
import com.stockPlus.mapper.UserNoteMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/dashboard/notes")
@RequiredArgsConstructor
public class UserNoteController {

    private final UserNoteMapper userNoteMapper;
    private final String uploadDir = "/app/img/notes"; // [v35.00] 이미지 저장 절대 경로

    /**
     * [v35.00] 매매일지 이미지 업로드 (Authentication 주입)
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("image") MultipartFile file, Authentication authentication) {
        try {
            if (file.isEmpty()) return ResponseEntity.badRequest().build();
            
            // [v36.65] 로깅 보강
            String usrId = (authentication != null) ? authentication.getName() : "anonymous";
            log.info(">>> [Journal] Image Upload attempt by: {}", usrId);

            // 1. 폴더 생성 확인
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            // 2. 파일명 생성 (UUID)
            String originalName = file.getOriginalFilename();
            String extension = (originalName != null && originalName.contains(".")) 
                ? originalName.substring(originalName.lastIndexOf(".")) 
                : ".jpg";
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadDir, fileName);

            // 3. 파일 저장
            Files.write(filePath, file.getBytes());
            log.info(">>> [Journal] Image Saved: {} by {}", fileName, usrId);

            // 4. 접근 URL 반환
            return ResponseEntity.ok(Collections.singletonMap("url", "/stockPlus/api/notes/images/" + fileName));
        } catch (Exception e) {
            log.error(">>> [Journal] Upload Error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * [v36.65] Zero-Trust: 주입받은 Authentication 객체에서 안전하게 사용자 ID 추출
     */
    private String getUsrId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized: Authentication is required.");
        }
        return authentication.getName();
    }

    @GetMapping
    public List<UserNote> getAllNotes(Authentication authentication) {
        return userNoteMapper.findAllByUsrId(getUsrId(authentication));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserNote> getNote(@PathVariable Long id, Authentication authentication) {
        userNoteMapper.incrementViewCount(id);
        UserNote note = userNoteMapper.findByIdAndUsrId(id, getUsrId(authentication));
        return note != null ? ResponseEntity.ok(note) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public UserNote createNote(@RequestBody UserNote note, Authentication authentication) {
        note.setUsrId(getUsrId(authentication));
        if (note.getCategory() == null) note.setCategory("GENERAL");
        userNoteMapper.insert(note);
        return note;
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserNote> updateNote(@PathVariable Long id, @RequestBody UserNote note, Authentication authentication) {
        note.setId(id);
        note.setUsrId(getUsrId(authentication));
        int updated = userNoteMapper.update(note);
        return updated > 0 ? ResponseEntity.ok(note) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id, Authentication authentication) {
        int deleted = userNoteMapper.delete(id, getUsrId(authentication));
        return deleted > 0 ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
